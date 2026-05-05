export type Poem = {
  id: string;
  title: string;
  author: string;
  body_text: string;
  era: string;
  created_at: string;
  created_by?: string | null;
};

export type Annotation = {
  id: string;
  poem_id: string;
  user_id: string;
  quote: string;
  comment_text: string;
  start_index: number;
  end_index: number;
  created_at: string;
  profiles?: {
    username: string;
    avatar_url: string | null;
  } | null;
  likes_count?: number;
};

export type ProfileStats = {
  id: string;
  username: string;
  avatar_url: string | null;
  bio: string | null;
  favorite_author?: string | null;
  favorite_poem?: string | null;
  created_at: string;
  total_annotations: number;
  total_likes_received: number;
  poems_annotated: number;
};
