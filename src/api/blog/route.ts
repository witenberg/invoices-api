import { supabase } from '../../utils/supabase';
import matter from 'gray-matter';

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

// GET /api/blog - Get all blog posts
export async function GET(c: any) {
  try {
    const lang = c.req.query('lang') || 'en';
    
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
      return c.json([]);
    }

    // Filter for .md files and process them
    const mdFiles = files.filter(file => file.name.endsWith('.md'));
    const posts: BlogPost[] = [];

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
        
        // Use slug from frontmatter, fallback to filename without extension
        const slug = matterResult.data.slug || file.name.replace(/\.md$/, '');

        posts.push({
          slug,
          content: matterResult.content,
          lang,
          ...matterResult.data,
        } as BlogPost);
      } catch (err) {
        console.error(`Error processing ${file.name}:`, err);
      }
    }

    // Sort posts by date (newest first)
    const sortedPosts = posts.sort((a, b) => {
      if (a.date < b.date) {
        return 1;
      } else {
        return -1;
      }
    });

    return c.json(sortedPosts);
  } catch (error) {
    console.error('Error in /api/blog:', error);
    return c.json({ error: 'Internal server error' }, 500);
  }
}
