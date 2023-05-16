
old replication feature: to provide high availability for stateless services. 


# Questions


why let replicas compete for a request?


Seems we can use a gateway to do health checking and load balancing?


[bookmark](https://jina-v-raft--jina-docs.netlify.app/concepts/orchestration/scale-out/#replicate-stateless-executors)


what’s the purpose of leaving the `Deployment.__init__` method with an empty function body?


clarify the Pod type: HEAD, WORKER, GATEWAY


I think we should model the stateful executor as a big FSM which consists of peer FSM, executor FSM, and raft FSM.  Since these three is wrapped in a big FSM, there’s no need to leverage multiprocessing, thus we can get around issues incurred by multiprocessing.


maybe we should change the `shard_id` in `_ReplicaSet` .


`shard_id` vs `replica_id`


Clarify Orchestrator, Deployment, and Flow. 


Clarify Pod, Runtime, Executor, ReplicaSet, Shard, Container, Container Group.


Clarify metaclass, superclass, mixin class


Clarify jina_cli api. How it’s used? How Namespace is passed through?


Clarify how a request is sent from jina client to an executor? Who handles the request? Who dispatch the request? Who sends the response? 


Clarify shards and replicas?


Clarify port, address, host


```python
port = args.port[0] if isinstance(args.port, list) else args.port
    address = f'{args.host}:{port}'
    executor_target = f'{args.host}:{port + RAFT_TO_EXECUTOR_PORT}'

    # if the Executor was already persisted, retrieve its port and host configuration
    logger = JinaLogger('run_raft', **vars(args))
    persisted_address = jraft.get_configuration(raft_id, raft_dir)
    if persisted_address:
        logger.debug(f'Configuration found on the node: Address {persisted_address}')
        address = persisted_address
        executor_host, port = persisted_address.split(':')
        executor_target = f'{executor_host}:{int(port) + 1}'
```


Finally, what shall I exactly do? What results shall I present?


help developing the stateful feature? 


make it more efficient? I.e. better QPS.   It lacks of many common optimizations. It does not support various consistency modes. The code is not well-structured.


advices on learning open-source projects?


Will asking many question be impolite?


How to trace the code path?


# How Jina works?


## What under the hood when deploy?


```python
from jina import Deployment

dep = Deployment(uses=FooExecutor)

with dep
    dep.block()
```


The definition of `Deployment` is in `orchestrate/deployment/__init__.py`. 


When `dep = Deployment(uses=FooExecutor)` is executed, the `__init__` method of Deployment will be executed. 


There’re two `__init__` methods. Have no idea about the first `__init__` method, maybe it’s used to restrict the user input. I believe it’s the second `__init__` gets called. 


This method mostly does arg parsing the checking. Besides, it sets a graph which depicts the flow of data. Typically, the graph consists of a start gateway and an executor. Note, the gateway and the executor will not start until the deployment starts.


Since the `Deployment` class is a subclass of the `BaseOrchestrator` class, it inherits the `__enter__` and `__exit__` methods defined in the `BaseOrchestrator` class. 


The with clause in Python constructs a context. You may regard it as a scope in C++, Rust, etc. When `with dep` is executed, the control flow enters the context and the `__enter__` method gets called. When the control flow exits the context, the `__exit__` method gets called. 


When the inherited `__enter__` method gets called, the `start` method of the `Deployment` gets called. The basic execution unit in Jina is a pod. The `start` method first initiates a set of non-executor pods which may include use_before_pod, use_after_pod, head_pod, and gateway_pod. Their usages are still vague to me. 


Each pod is associated a runtime. There’re three runtime types: GATEWAY, HEAD, and WORKER. Non-executor pods maybe of type GATEWAY or HEAD while executor pods is of type WORKER. Have no idea about the usage of the head pod. The gateway does forwarding, dispatching jobs. Any else?


After these non-executor pods are initiated, a set of `_ReplicaSet` instances are constructed. It seems each shard will associate a replica set. Not clear about shard vs. replica. Alright, let’s assume there’s only one shard and hence only one replica set is constructed. 


Since the metaclass of the `Deployment` class is the `DeploymentType` class which inherits the `ExitStack` class, we can call `enter_context` explicitly to invoke the `__enter__` method of a `_ReplicaSet` instance.


When the `__enter__` method of the `_ReplicaSet` class gets called, the executor pods in the replica set are constructed and started. 


Each executor pod contains two workers: a runtime worker and a raft worker. The runtime worker serves for the executor while the raft worker handles Raft consensus.


## How a request sent from Jina client to an executor?


# Python


python `__init__` file


The `__init__.py` file is a special file in Python that is used to mark a directory as a Python package. When a directory contains an `__init__.py` file, it indicates that the directory should be treated as a Python package, allowing you to organize your code into modules and sub-packages.


The `__init__.py` file can be empty or can contain Python code. It is executed when the package is imported and can be used to perform initialization tasks for the package, such as setting up variables, importing modules, or defining functions and classes that will be available when the package is used.


python superclass vs. metaclass 


The superclass and metaclass are two different concepts in object-oriented programming:

1. Superclass: The superclass, also known as the base class or parent class, is an existing class from which a new class (subclass) is derived or extended. The subclass inherits the properties (attributes and methods) of the superclass and can override or extend them as needed. In other words, the superclass serves as a blueprint for the subclass. When a subclass extends a superclass, it inherits the superclass's characteristics and can add its own specific behavior.
2. Metaclass: A metaclass, also known as a class factory, is a class that defines the behavior of other classes (its instances). In Python, a metaclass is specified by assigning it to the `metaclass` parameter in a class definition. The metaclass controls the creation, initialization, and behavior of class objects. It defines how a class should be constructed, what attributes and methods it should have, and how its instances should behave. The metaclass is responsible for defining the behavior of the class, while the class itself defines the behavior of its instances.

To summarize, the superclass is an existing class that is extended or inherited by a subclass, while the metaclass is a class that defines the behavior of other classes (including the superclass). The superclass-subclass relationship defines the inheritance hierarchy, where the subclass extends the superclass, whereas the metaclass-class relationship defines how classes are created and behave.


dry run endpoint 


In the context of Jina, a "dry run endpoint" refers to an endpoint that allows you to simulate or test the behavior of a flow or an executor without actually executing the full processing or performing any modifications to the data.


When you perform a "dry run" on an endpoint, it means that you can send a request to the endpoint, and it will process the request up to a certain point without making any permanent changes or modifications. This is useful for testing and debugging purposes, as it allows you to verify the behavior of your flow or executor without affecting the actual data or making any irreversible changes.


The dry run endpoint typically provides information about the intermediate state of the processing, such as the routing of documents, the execution of individual executors, or the data flow within the system. It helps you understand how your flow or executor is processing the data and identify any potential issues or bottlenecks.


By using a dry run endpoint, you can gain insights into the processing steps, check if the desired operations are being performed correctly, and analyze the output or intermediate results without committing any changes to the data.


In summary, a dry run endpoint in Jina allows you to simulate and test the behavior of a flow or an executor without making permanent modifications to the data. It provides a safe and informative way to verify the processing logic and debug your Jina application.


how python decorator works?


In Python, a decorator is a special type of function that allows you to modify the behavior of another function or class. It provides a way to wrap or extend the functionality of the decorated object without modifying its source code directly.


Here's a basic example to illustrate how decorators work:


```python
def decorator_function(original_function):
    def wrapper_function(*args, **kwargs):
        # Code to be executed before the original function
        print("Decorator function executed before '{}'".format(original_function.__name__))

        # Call the original function
        result = original_function(*args, **kwargs)

        # Code to be executed after the original function
        print("Decorator function executed after '{}'".format(original_function.__name__))

        # Return the result of the original function
        return result

    # Return the wrapper function
    return wrapper_function


@decorator_function
def greeting(name):
    print("Hello, {}!".format(name))


# Call the decorated function
greeting("Alice")

```


In the example above, we have a decorator function called `decorator_function`. It takes the original function as an argument and defines a wrapper function inside it. The wrapper function adds extra functionality before and after the original function is called.


The `@decorator_function` syntax is used to apply the decorator to the `greeting` function. This is equivalent to `greeting = decorator_function(greeting)`. The decorator function is executed at the time of decoration and replaces the original function with the wrapper function.


When the decorated `greeting` function is called with an argument, the following steps occur:

1. The decorator function is executed before the original function. In this example, it prints a message indicating that the decorator function is executed.
2. The original function is called with the provided arguments.
3. The decorator function is executed after the original function. In this example, it prints a message indicating that the decorator function is executed again, but this time after the original function.

Decorators are powerful tools in Python that allow you to modify the behavior of functions or classes transparently. They are commonly used for logging, timing, authentication, memoization, and other cross-cutting concerns.


python pass by value or reference


In Python, variables are passed by reference, but the references themselves are passed by value. This means that when you pass a variable to a function as an argument, a copy of the reference to the object is created and passed to the function.


To understand this concept, let's consider an example:


```text
def modify_list(lst):
    lst.append(4)
    lst = [1, 2, 3]

my_list = [0]
modify_list(my_list)
print(my_list)

```


In this example, we have a function called `modify_list` that takes a list as an argument. Inside the function, we first append the value `4` to the list. Then, we assign a new list `[1, 2, 3]` to the `lst` parameter.


If Python passed variables by reference, we would expect the output to be `[0, 4]` because the modifications made inside the function would affect the original list. However, Python actually passes the reference to the list by value. So, the output of the above code would be `[0, 4]`.


When the function `modify_list` is called, a copy of the reference to `my_list` is created and passed to the function. Inside the function, modifications to the list itself (e.g., appending `4`) affect the original list because they are operating on the same object. However, when we assign a new list to `lst`, it creates a new object and the reference inside the function is updated to point to the new list. This does not affect the original `my_list` outside the function.


In summary, Python passes variables by reference, but the references themselves are passed by value. This means that modifications to mutable objects (like lists) made inside a function can affect the original object, but reassigning the reference to a new object does not affect the original reference.


python `__enter__` and `__exit__` methods


In Python, the `__enter__` method is a special method that is defined as part of the context manager protocol. It is used in conjunction with the `with` statement to set up resources and establish a context for a block of code. The `__enter__` method is called when entering the block, and it returns the context object that will be used within the block.


Here's a basic example that demonstrates the usage of `__enter__` method:


```text
class MyContext:
    def __enter__(self):
        # Set up resources or acquire locks
        print("Entering the context")
        return self

    def __exit__(self, exc_type, exc_val, exc_tb):
        # Clean up resources or release locks
        print("Exiting the context")

# Using the context manager with the `with` statement
with MyContext() as context:
    # Code block where the context is active
    print("Inside the context")

```


In this example, the `MyContext` class defines the `__enter__` method, which is responsible for setting up any necessary resources or acquiring locks. In this case, it simply prints a message indicating that it's entering the context and returns `self`.


When the `with` statement is encountered, the `__enter__` method of the context manager is called, and the returned context object (in this case, an instance of `MyContext`) is assigned to the target variable (`context` in this case).


The code block inside the `with` statement is where the context is active. In this example, it prints a message indicating that it's inside the context.


After the code block is executed or if an exception is raised within the block, the `__exit__` method of the context manager is called. This method is responsible for cleaning up resources or releasing locks. In this example, it simply prints a message indicating that it's exiting the context.


The `with` statement ensures that the `__enter__` method is called before entering the code block and that the `__exit__` method is called after exiting the code block, regardless of whether an exception occurs or not. This provides a convenient way to manage resources and ensure proper cleanup even in the presence of exceptions.


Pod in jina


In Jina, a "Pod" is a fundamental unit of computation and communication. It is a containerized component that performs a specific task within the Jina ecosystem. Pods are designed to be modular and can be connected together to form complex processing pipelines.


A Pod typically encapsulates an Executor, which is responsible for executing a specific operation or function on the data. Examples of Executors include encoders, indexers, rankers, and evaluators. Each Pod can have one or more Executors, and these Executors work together to process and transform the data.


Pods communicate with each other through network connections, allowing them to exchange data and collaborate in a distributed manner. They can run on different machines or containers, enabling scalable and parallel processing.


In summary, a Pod in Jina represents a self-contained processing unit that encapsulates one or more Executors. Pods are connected together to form processing pipelines, enabling distributed and scalable computation in Jina.


Runtime in jina 


In Jina, the "Runtime" refers to the execution environment where the Jina system runs. It provides the necessary infrastructure and resources for running Jina components such as Pods, Flows, and Executors. The Runtime manages the lifecycle of these components, handles communication between them, and ensures efficient execution of the Jina system.


The Runtime in Jina can be local or distributed, depending on the deployment configuration. In a local runtime, all the components run on a single machine or container. In a distributed runtime, the components are distributed across multiple machines or containers, enabling parallel processing and scalability.


The Runtime handles various aspects of the Jina system, including:

1. Component Execution: It manages the execution of Pods, Executors, and Flows, ensuring they run in the appropriate order and handle data correctly.
2. Network Communication: It handles the communication between Pods and other components, facilitating data flow and coordination.
3. Resource Management: It manages the allocation and utilization of system resources such as CPU, memory, and storage to optimize performance and efficiency.
4. Fault Tolerance: It provides mechanisms to handle failures and recover from errors, ensuring the reliability of the Jina system.

Overall, the Runtime in Jina plays a crucial role in enabling the execution and coordination of the various components within the Jina system, both in local and distributed environments.


python abc module


The `abc` module in Python provides support for defining abstract base classes (ABCs). ABCs are classes that serve as a blueprint for other classes and define a common interface or set of methods that subclasses are expected to implement.


In your code snippet, the line `from abc import ABC, abstractmethod` imports two important elements from the `abc` module:

1. `ABC`: It stands for "Abstract Base Class" and is a class that can be used as a base class for other classes. By inheriting from `ABC`, a class becomes an abstract base class itself. An abstract base class cannot be instantiated directly and is meant to be subclassed by concrete classes. It serves as a marker for the class hierarchy.
2. `abstractmethod`: It is a decorator that is used to declare abstract methods within an abstract base class. An abstract method is a method that is defined in the abstract base class but does not provide an implementation. Subclasses of the abstract base class are required to override and provide their own implementation of the abstract methods.

By using the `ABC` class as a base class and decorating methods with `abstractmethod`, you can define abstract base classes with abstract methods that enforce a specific interface for their subclasses. Subclasses must implement all the abstract methods, or they themselves become abstract classes. This mechanism helps in defining common behaviors and contracts for classes that share a certain interface or functionality.


`__all__` list 


The `__all__` variable is a list that defines the public interface of a module in Python. When a module is imported using the `import *` syntax, only the names listed in the `__all__` list are imported. It acts as a whitelist of names that are considered public and should be accessible to users of the module.


In your code snippet, `__all__` is defined as `['BasePod', 'Pod']`. This means that when the module containing this code is imported using the `import *` syntax, only the names `'BasePod'` and `'Pod'` will be imported. Other names or attributes defined in the module will not be imported by default.


This approach is commonly used to explicitly specify which names should be part of the public interface of a module. By limiting the exposed names, you can control the namespace pollution and provide a clear and concise API for users of your module.


`argparse.Namespace` 


The `__init__` method in the given code snippet is the constructor of a class. It takes an argument named `args` of type `argparse.Namespace`.


The `argparse.Namespace` is a simple object used to hold the attributes parsed by the `argparse` module. It is typically used to store command-line arguments and their values. When command-line arguments are parsed using `argparse`, the resulting namespace object contains attributes corresponding to the parsed arguments.


In the context of the `__init__` method, the `args` parameter is expected to be an instance of `argparse.Namespace` that holds the arguments parsed from the command line. This allows the class to access and use those arguments during its initialization process or throughout its lifetime.


python context manager 


A context manager is a Python object that is used to manage resources and define a specific context of execution. It allows you to allocate and release resources automatically when entering and exiting a specific block of code. The `with` statement is used to work with context managers in Python.


A context manager is defined by implementing two special methods:

1. `__enter__()`: This method is called when entering the context. It sets up the necessary resources or environment for the context. It can return an object that will be assigned to the variable specified in the `as` clause of the `with` statement.
2. `__exit__(exc_type, exc_value, traceback)`: This method is called when exiting the context. It is responsible for cleaning up or releasing any acquired resources. It receives information about any exception that occurred within the context.

By using a context manager, you ensure that resources are properly managed and released, even if an exception occurs. It provides a convenient way to handle common resource management patterns, such as opening and closing files, acquiring and releasing locks, establishing and closing network connections, and more.


Here's an example of using a context manager to open and close a file:


```text
with open('file.txt', 'r') as file:
    # Perform operations on the file
    # The file will be automatically closed at the end of the block

```


In this example, the `open()` function returns a file object, which is a context manager. The `with` statement ensures that the file is properly closed when the block of code is exited, regardless of whether an exception occurred or not.


python `ExitStack` 


`ExitStack` is a context manager provided by the `contextlib` module in Python. It is a versatile tool that allows you to manage a dynamic stack of context managers. It is particularly useful when you need to work with an unknown or variable number of context managers.


The `ExitStack` class can be used as a context manager itself, or it can be used as a helper within another context manager. It keeps track of the context managers that are entered and ensures that their `__exit__()` methods are called in reverse order when exiting the context.


The main advantage of `ExitStack` is its ability to handle an arbitrary number of context managers without explicitly specifying them in the code. You can dynamically push new context managers onto the stack using the `enter_context()` method. When the context is exited, the `ExitStack` automatically calls the `__exit__()` methods of the context managers in reverse order.


Here's an example that demonstrates the usage of `ExitStack`:


```text
from contextlib import ExitStack

def process_data():
    with ExitStack() as stack:
        # Push context managers onto the stack
        file1 = stack.enter_context(open('file1.txt', 'r'))
        file2 = stack.enter_context(open('file2.txt', 'w'))

        # Perform operations on the files

    # The file objects are automatically closed when exiting the context

```


In this example, `ExitStack` is used to manage the opening and closing of two files. The `enter_context()` method is used to push the file objects onto the stack. When the context is exited, the `ExitStack` automatically calls the `__exit__()` methods of the file objects, ensuring that they are properly closed.


By using `ExitStack`, you can dynamically manage a stack of context managers, making your code more flexible and adaptable to different scenarios.


the purpose of using `enter_context` 


The `enter_context` method is used in the context of context managers in Python. It is a method provided by the `contextlib.ExitStack` class, which is a context manager itself.


The `enter_context` method is used to enter a new context manager and establish a new context for the code block that follows. It ensures that the entered context is properly set up before executing the code block and that any necessary cleanup actions are performed when the code block exits, regardless of whether an exception occurred.


Here's how it works:

1. When `enter_context` is called with a context manager as an argument, it enters the context manager and returns the entered context.
2. The entered context is then managed by the `ExitStack` context manager, which keeps track of all the entered contexts.
3. The code block following the `enter_context` call is executed within the entered context.
4. Once the code block completes or an exception is raised, the `ExitStack` context manager ensures that all the entered contexts are properly exited by calling their `__exit__` methods. This ensures that any necessary cleanup actions are performed.

In the provided code snippet, the `enter_context` method is used to manage the lifecycle of different pods (`uses_before_pod`, `uses_after_pod`, `head_pod`, `gateway_pod`). By entering the context of each pod using `enter_context`, the `ExitStack` context manager takes care of starting and stopping those pods correctly, ensuring that any necessary cleanup is performed when the code block exits.


In summary, `enter_context` is used to manage multiple context managers and ensure their proper setup and cleanup in a convenient and reliable manner.


python `*` args


The `__init__` method you provided has a parameter list that starts with `*,`. This syntax indicates that all the parameters that follow must be keyword-only arguments.


In Python, keyword-only arguments are arguments that can only be passed by specifying their names explicitly, and they cannot be passed positionally. They are useful when you want to enforce clarity and prevent potential errors when calling a function or initializing an object.


Here's an example to illustrate the usage of keyword-only arguments:


```text
class MyClass:
    def __init__(self, *, name, age):
        self.name = name
        self.age = age

obj = MyClass(name='John', age=25)

```


In the above example, the `__init__` method of the `MyClass` class has two keyword-only arguments: `name` and `age`. When creating an instance of `MyClass`, you must pass values for these arguments by explicitly specifying their names using the `name=value` syntax.


Attempting to pass arguments positionally would raise a `TypeError`:


```text
obj = MyClass('John', 25)  # Raises TypeError

```


By using the `*,` syntax in the parameter list, you ensure that the `name` and `age` arguments can only be passed as keyword arguments, making the code more explicit and less error-prone.


python `*args` and `**kwargs` 


In Python, `*args` and `**kwargs` are special syntaxes used in function definitions to handle a varying number of arguments.


The `*args` syntax allows a function to accept any number of positional arguments. When `*args` is used in a function definition, it collects any extra positional arguments into a tuple. Here's an example:


```text
def my_function(*args):
    for arg in args:
        print(arg)

my_function(1, 2, 3)  # Output: 1 2 3
my_function('a', 'b', 'c', 'd')  # Output: a b c d

```


In the example above, the `my_function` accepts any number of positional arguments. The arguments are collected into the `args` tuple, and the function can iterate over them.


On the other hand, `**kwargs` allows a function to accept any number of keyword arguments. It collects the extra keyword arguments into a dictionary where the keys are the argument names and the values are the corresponding values. Here's an example:


```text
def my_function(**kwargs):
    for key, value in kwargs.items():
        print(f"{key}: {value}")

my_function(name='John', age=25)  # Output: name: John  age: 25
my_function(country='USA', language='English', capital='Washington')  # Output: country: USA  language: English  capital: Washington

```


In the example above, the `my_function` accepts any number of keyword arguments. The arguments are collected into the `kwargs` dictionary, and the function can iterate over the keys and values.


Both `*args` and `**kwargs` are optional and can be used together in a function definition to accept any combination of positional and keyword arguments. For example:


```text
def my_function(*args, **kwargs):
    for arg in args:
        print(arg)
    for key, value in kwargs.items():
        print(f"{key}: {value}")

my_function(1, 2, 3, name='John', age=25)  # Output: 1 2 3  name: John  age: 25

```


python mixin class


A mixin class is a type of class that is designed to provide a specific set of functionality to other classes through multiple inheritance. Instead of serving as a standalone class, a mixin class is intended to be mixed in with other classes to extend their functionality.


The purpose of a mixin class is to promote code reuse and modularity by separating specific sets of behavior into separate classes. By mixing in a mixin class, a class can inherit and incorporate the methods and attributes defined in the mixin class without explicitly inheriting from it.


Here are some characteristics of a mixin class:

1. No specific subclassing hierarchy: A mixin class does not define a specific subclassing hierarchy. It is designed to be mixed in with different classes to provide additional functionality.
2. Provides specific behavior: A mixin class typically defines a specific set of methods or attributes that provide a particular behavior or feature. These methods can be mixed in with other classes to enhance their functionality.
3. Multiple inheritance: To incorporate the functionality of a mixin class, a class can inherit from the mixin class along with other base classes. This allows the class to inherit and utilize the methods and attributes from both the mixin class and other base classes.
4. Does not depend on subclass implementation: A mixin class is designed to be independent of the subclass implementation. It provides a specific behavior that can be used by different classes regardless of their individual implementations.

The usage of mixin classes can be beneficial in scenarios where different classes need to share common behavior without creating a deep inheritance hierarchy. By mixing in specific functionality through mixin classes, classes can be modular, reusable, and promote code organization.


sandbox 


In software development and testing, a sandbox refers to an isolated environment where code or applications can be executed securely and independently from the rest of the system. It provides a controlled and restricted space to run untrusted or potentially harmful code without affecting the underlying system or other applications.


The purpose of a sandbox is to prevent any malicious or unintended actions from impacting the system by limiting the resources and permissions available to the code running within it. Sandboxing techniques often involve using virtualization or containerization technologies to create a separate instance of the operating system or runtime environment.


In the context of the code snippet you provided, the sandbox mode may refer to a specific configuration or environment in which the code is being executed. It is possible that certain actions or behaviors are enabled or disabled when running in the sandbox mode, and the `update_sandbox_args()` method is responsible for updating the sandbox-specific configuration or parameters.


`use_before_pod` and `use_after_pod` 


The `uses_before` and `uses_after` pods are components that can be specified to run before and after the main processing pod, respectively. They are optional components that allow you to extend the functionality of the main pod by adding preprocessing or post-processing steps.


Here's a brief explanation of their purpose:

1. `uses_before`: This pod is executed before the main processing pod. It can be used for tasks such as data preprocessing, data augmentation, or any other operations that need to be performed before the main processing takes place. The `uses_before` pod prepares the input data or sets up any necessary resources for the main processing pod.
2. `uses_after`: This pod is executed after the main processing pod. It can be used for tasks such as post-processing, result analysis, or any operations that need to be performed on the output of the main processing. The `uses_after` pod can process the results generated by the main processing pod or perform any necessary actions based on the output.

By using `uses_before` and `uses_after` pods, you can create a pipeline of components where the main processing pod is preceded by a preprocessing step and followed by a post-processing step. This modular design allows for flexibility and extensibility in constructing data processing workflows.

