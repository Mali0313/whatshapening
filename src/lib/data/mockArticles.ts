export interface Article {
  id: string;
  title: string;
  slug: string;
  excerpt: string;
  content: string;
  cover_image_url: string;
  video_url?: string | null;
  video_path?: string | null;
  video_thumbnail_url?: string | null;
  video_duration?: number | null;
  is_approved?: boolean;
  category_id: string;
  category?: {
    id: string;
    name: string;
    slug: string;
  };
  author_id: string;
  author?: {
    id: string;
    full_name: string;
    avatar_url: string;
    bio: string;
    role: string;
  };
  type: 'news' | 'article';
  status: 'published' | 'draft' | 'pending' | 'rejected';
  is_breaking: boolean;
  is_featured: boolean;
  views: number;
  published_at: string;
  created_at: string;
  tags?: string[];
}

export interface Category {
  id: string;
  name: string;
  slug: string;
  description: string;
}

export const FALLBACK_CATEGORIES: Category[] = [
  { id: 'cat-pakistan', name: 'Pakistan', slug: 'pakistan', description: 'Comprehensive coverage of political, economic, and social developments across Pakistan.' },
  { id: 'cat-world', name: 'World', slug: 'world', description: 'Global affairs, international treaties, geopolitics, and foreign relations.' },
  { id: 'cat-politics', name: 'Politics', slug: 'politics', description: 'National legislation, governance, election cycles, and constitutional debates.' },
  { id: 'cat-sports', name: 'Sports', slug: 'sports', description: 'Cricket, football, Olympics, athletic championships, and athlete profiles.' },
  { id: 'cat-business', name: 'Business', slug: 'business', description: 'Financial markets, banking policy, startups, trade, and economic analysis.' },
  { id: 'cat-tech', name: 'Technology', slug: 'technology', description: 'Artificial intelligence, semiconductors, software, cybersecurity, and space tech.' },
  { id: 'cat-entertainment', name: 'Entertainment', slug: 'entertainment', description: 'Cinema, television, performing arts, literature, and cultural festivals.' },
  { id: 'cat-health', name: 'Health', slug: 'health', description: 'Medical discoveries, public healthcare policy, epidemiology, and wellness.' },
  { id: 'cat-education', name: 'Education', slug: 'education', description: 'University research, primary schooling, vocational education, and pedagogy.' },
  { id: 'cat-science', name: 'Science', slug: 'science', description: 'Astronomy, quantum physics, climate science, geology, and evolutionary biology.' },
  { id: 'cat-opinion', name: 'Opinion', slug: 'opinion', description: 'Essays, columns, guest perspectives, and positions of The Editorial Board.' },
];

export const FALLBACK_AUTHORS = {
  author1: {
    id: 'a0000000-0000-0000-0000-000000000001',
    full_name: 'Tariq Mansoor',
    avatar_url: 'https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?auto=format&fit=crop&w=256&q=80',
    bio: 'Senior Diplomatic and South Asian Affairs Correspondent for What\'s Happening.',
    role: 'writer',
  },
  author2: {
    id: 'a0000000-0000-0000-0000-000000000002',
    full_name: 'Dr. Ayesha Siddiqui',
    avatar_url: 'https://images.unsplash.com/photo-1573496359142-b8d87734a5a2?auto=format&fit=crop&w=256&q=80',
    bio: 'Chief Science, Energy, and Technology Editor.',
    role: 'writer',
  },
  author3: {
    id: 'a0000000-0000-0000-0000-000000000003',
    full_name: 'Arthur Vance',
    avatar_url: 'https://images.unsplash.com/photo-1500648767791-00dcc994a43e?auto=format&fit=crop&w=256&q=80',
    bio: 'Lead Editorial Board Member and Geopolitics Essayist.',
    role: 'admin',
  },
};

// Site strictly uses authentic articles from the database. No dummy news articles.
export const FALLBACK_ARTICLES: Article[] = [];
