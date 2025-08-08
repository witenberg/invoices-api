import { supabase } from '../../../utils/supabase';
import matter from 'gray-matter';
import { remark } from 'remark';
import html from 'remark-html';

export interface BlogPost {
  title: string;
  description: string;
  author: string;
  date: string;
  category: string;
  tags: string[];
  image: string;
  slug: string;
  lang: string;
  content: string;
  excerpt?: string;
}

// GET /api/blog/[slug] - Get a specific blog post
export async function GET(c: any) {
  try {
    const slug = c.req.param('slug');
    const lang = c.req.query('lang') || 'en';
    console.log('slug', slug);
    console.log('lang', lang);

    // List all files in the blog bucket for the specified language
    const { data: files, error } = await supabase.storage
      .from('blog')
      .list(lang, {
        limit: 100,
        sortBy: { column: 'name', order: 'asc' }
      });

    if (error) {
      console.error('Error listing files:', error);
      return c.json({ error: 'Failed to fetch blog posts' }, 500);
    }

    if (!files) {
      return c.json({ error: 'Post not found' }, 404);
    }

    // Filter for .md files
    const mdFiles = files.filter(file => file.name.endsWith('.md'));

    // Find the file that contains the matching slug in frontmatter
    for (const file of mdFiles) {
      try {
        // Download the file content
        const { data: fileData, error: downloadError } = await supabase.storage
          .from('blog')
          .download(`${lang}/${file.name}`);

        if (downloadError) {
          console.error(`Error downloading ${file.name}:`, downloadError);
          continue;
        }

        // Convert blob to text
        const fileContent = await fileData.text();
        
        // Parse frontmatter
        const matterResult = matter(fileContent);
        
        // Check if the slug in frontmatter matches
        const fileSlug = matterResult.data.slug || file.name.replace(/\.md$/, '');
        
        if (fileSlug === slug) {
          // Use remark to convert markdown into HTML string
          const processedContent = remark()
            .use(html)
            .processSync(matterResult.content);
          const contentHtml = processedContent.toString();

          // Combine the data with the slug and content
          const post: BlogPost = {
            slug,
            content: contentHtml,
            lang,
            ...matterResult.data,
          } as BlogPost;

          return c.json(post);
        }
      } catch (err) {
        console.error(`Error processing ${file.name}:`, err);
      }
    }

    return c.json({ error: 'Post not found' }, 404);
  } catch (error) {
    console.error('Error in /api/blog/[slug]:', error);
    return c.json({ error: 'Internal server error' }, 500);
  }
}
