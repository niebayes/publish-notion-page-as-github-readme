
# 一个简单的设计


考虑一个实现起来简单、又能体现 lsm tree 核心特性的 lsm db 应该是怎样的。


首先考虑 client server 交互方式。不考虑 RPC 或 plain TCP 等网络连接方式，直接让 server 暴露出一个 command line interface，即 client 直接像在 shell 中输入命令一样，与本地的 server 交互。server 收到 cmd 后，再将 cmd 转发给 db，由 db 进行 handle。


对于一个 key-value 数据库，某些数据库将 key, value 分离存储，有的甚至采取 column family 的方式将 value 分离存储。考虑到实现上的简洁性，本项目选择将 key, value 聚合在一起存储，之后将 key, value 的聚合物称为 key。暂时只考虑定长的 key, value，故 key 中不需要存储 key length 和 value length。lsm tree 是日志写，即不会真正地删除一个 key，而是写入一个新的 key，但是设置一个 marker 或称 tombstone，标识这个 key 被删除了，因此需要使用至少一个 bit 来存储这个 marker。同样是由于日志写，数据库中可能会同时存在同一个 key 的多个不同版本。为了标识不同的版本，需要引入一个 version number 或称 sequence number。对于每一个新的 key，数据库会分配一个新的、独特的、全局递增的 sequence number。总结，key 最少需要包含 key, value, delete marker 和 sequence number。


关于 memtable，不使用 double buffer，即像 leveldb 那样设置一个 active 和一个 immutable memtable，而只使用 single buffer，即 db 只维护一个 memtable。memtable 应该暴露出一些接口给 db，供 cmd handler 调用，例如 put, get, delete, range 等。至于 memtable 的 backing 数据结构，即 in-memory index，考虑使用最简单的 vector。当 memtable 中数据量达到设定的阈值以后，将所有 key 根据指定的比较器进行排序。排序后的 keys 被写入到一个 sstable 文件中。此过程即 minor compaction。当然，如果 memtable 的容量大于 sstable 的容量，一次 minor compaction 也可能生成多个 sstable 文件。


关于 sstable 文件，有很多设计点，提几个比较重要的。一个是 keys 的存储，即按照什么方式去组织 disk 中的数据。可以像 lsm tree 最初的论文那样，使用 B+ tree 的方式存储 keys，也可以像 leveldb 那样直接顺序存储 keys。另一个是，sstable 应该包含什么，如何去组织它所包含的这些东西。通常来说，memory 与 disk 之间是以 block（或称 page，当然还有其它叫法）为单位进行数据的传输。操作系统用 paging 的方式减小 memory internal fragmentation，且较小的 page 可以给 memory management 提供更高的自由度。对于数据库而言，以 block 为单位进行传输主要是为了分摊 disk io 的 overhead。因此，首先要明确的是，sstable 是以 block 为单位组织数据。


那么除了 keys 之外，sstable 还应该包含什么呢？经过多次 merge 之后，高层级的 sstables 可能会很大，则进行顺序查找会带来很大的 disk io overhead。故除了 keys 本身，sstable 通常会存储额外的 sparse index。sparse 意味着这个 index 是针对 block 而言的。根据 keys 在 sstable 中的组织方式的不同，sparse index 可以是简单的 fence pointers，即每个 block 中的最大 key 或最小 key 作为一个 fence pointer，所有的 blocks 所对应的所有的 fence pointers 被顺序组织起来，存储在 sstable 中特定的区域，通常称为 index segment。sparse index 也可以是比较复杂的形式，例如 b+ tree 或其他。由于 sparse index 的总大小通常小于一个 block 的大小，则 index segment 通常也称为 index block。


这里需要提一下，为什么 fence pointer 只需要包含最大 key 或最小 key，而不是两者都包含呢？除了两端的 fence pointers，对于中间的某两个相邻的 fence pointers，前者的最大值就是后者的最小值（当然，考虑到区间闭开，它们的大小关系可能与此处所述略有不同）。顺数第一的 fence pointer 所包含的最小值与倒数第一的 fence pointer 所包含的最大值，实际对应 sstable 所包含的 keys 的最小值和最大值。这两个值要么存储在 sstable 的 header 或 footer 中，要么当作 manifest 的一部分被持久化，因此没有必要作为 fence pointer 的一部分被存储。总结，fence pointer 只需要包含最小值或最大值。关于 header, footer, manifest 之后会提及。

