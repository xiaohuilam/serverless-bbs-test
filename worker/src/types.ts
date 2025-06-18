import type { D1Database, KVNamespace, R2Bucket } from '@cloudflare/workers-types';

// Bindings
export type Bindings = {
  DB: D1Database;
  KV_SESSIONS: KVNamespace;
  R2_BUCKET: R2Bucket;
  RP_NAME: string;
  RP_ID: string;
  ORIGIN: string;
};

// User-related types
export type User = { id: string; username: string; email: string; created_at: number; profile_bio?: string; avatar_r2_key?: string; };
export type Passkey = { id: string; user_id: string; pubkey_blob: ArrayBuffer; sign_counter: number; created_at: number; };

// Forum structure types
export type Node = { id: number; name: string; description: string | null; parent_node_id: number | null; sort_order: number; thread_count: number; reply_count: number; };
export type NodeWithLastPost = Node & { last_post_title: string | null; last_post_thread_id: number | null; last_post_time: number | null; };
// 更新 Thread 和 Reply 类型，移除 R2 key，直接使用 body
export type Thread = { 
    id: number; 
    node_id: number; 
    author_id: string; 
    title: string; 
    created_at: number; 
    last_reply_at: number | null; 
    last_reply_user_id: string | null; 
    view_count: number; 
    reply_count: number; 
    is_pinned: boolean; 
    is_locked: boolean; 
    body: string; // 不再是 body_r2_key
};
export type ThreadWithAuthor = Thread & { author_username: string; author_avatar_r2_key?: string };

export type Reply = { 
    id: number; 
    thread_id: number; 
    author_id: string; 
    created_at: number; 
    body: string; // 不再是 body_r2_key
    reply_to_id: number | null; 
};
export type ReplyWithAuthor = Reply & {
    author_username: string;
    author_avatar_r2_key?: string;
    quoted_author?: string;
    quoted_created_at?: number;
    quoted_body?: string; // body 现在直接从 join 的表中获取
};

export type Comment = { id: number; parent_type: 'thread' | 'reply'; parent_id: number; author_id: string; created_at: number; body_r2_key: string; };
export type CommentWithAuthor = Comment & { author_username: string, author_avatar_r2_key?: string };
