const { Client } = require('@notionhq/client');
const markdown = require('markdown-it')();
const fs = require('fs');

// Initialize the Notion client
const notion = new Client({
    auth: process.env.NOTION_API_KEY,
});

// Define the Notion page ID for your blog
const pageId = 'A-trip-on-learning-Jina-AI-1a15db43a4594971b99fbcfb565d2c9d'

// Define the local directory to save the blog content as a Markdown file
const localDir = './blog';

async function main() {
    try {
        // Fetch the Notion page by ID
        const page = await notion.pages.retrieve({ page_id: pageId });

        // Convert the page content to Markdown format
        const pageTitle = page.properties.Title.title[0].text.content;
        const pageContent = page.properties.Content.rich_text[0].text.content;
        const markdownContent = `# ${pageTitle}\n\n${markdown.render(pageContent)}`;

        // Save the Markdown content as a file in the local directory
        const filename = `${pageTitle}.md`;
        const filepath = `${localDir}/${filename}`;
        fs.writeFileSync(filepath, markdownContent);
    } catch (error) {
        console.error(error);
    }
}

main();
