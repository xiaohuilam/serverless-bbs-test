import React, { useState, useEffect, useCallback, useRef } from 'react';
import { useParams, Link, useNavigate } from 'react-router-dom';
import { apiClient } from '@/lib/api';
import { useAuth } from '@/hooks/useAuth';
import { Button } from '@/components/ui/button';
import { useToast } from "@/components/ui/use-toast";
import { format } from 'date-fns';
import { RichTextEditor } from '@/components/RichTextEditor';

// --- 类型定义 ---
interface UserInfo { author_username: string; }
interface Reply extends UserInfo {
    id: number;
    body: string;
    created_at: number;
    quoted_author?: string;
    quoted_created_at?: number;
    quoted_body?: string;
}
interface Thread extends UserInfo { id: number; title: string; body: string; created_at: number; replies: Reply[]; }

// --- 子组件 ---


const Post = ({ post, isOp, floor, onQuote }: { post: (Thread | Reply) & {author_username: string, author_avatar_r2_key?: string}, isOp?: boolean, floor: number, onQuote: () => void }) => {
    const navigate = useNavigate();
    const handleSendMessage = (e: React.MouseEvent) => {
        e.preventDefault();
        navigate('/notifications', { state: { newConversationWith: post.author_username } });
    };
    const defaultAvatar = 'https://www.hostloc.com/uc_server/images/noavatar_middle.gif';
    const avatarUrl = post.author_avatar_r2_key ? `/avatars/${post.author_avatar_r2_key}` : defaultAvatar;
    const hasQuote = 'quoted_author' in post && post.quoted_author;

    return (
        <div className="bg-white border border-[#CDCDCD] rounded-sm flex">
            <div className="w-40 shrink-0 border-r border-[#E5EDF2] p-4 text-center text-xs bg-[#F5FAFE]">
                <div className="border-b border-dashed border-[#E5EDF2] pb-3 mb-4">
                    <Link to={`/users/${post.author_id}`} className="font-bold text-base text-[#336699] hover:underline">{post.author_username}</Link>
                </div>
                <div className="my-2">
                    <Link to={`/users/${post.author_id}`}>
                        <img src={avatarUrl} className="mx-auto w-full rounded-sm object-cover" alt="avatar" />
                    </Link>
                </div>
                <p>中级会员</p><div className="my-2 space-y-1"><p>主题: 15</p><p>回帖: 136</p><p>积分: 340</p></div>
                <Button size="sm" variant="outline" className="h-6 px-2 text-xs" onClick={handleSendMessage}>发消息</Button>
            </div>
            <div className="w-full p-4 bg-white">
                <div className="flex justify-between items-center text-xs text-gray-500 border-b border-dashed border-[#E5EDF2] pb-2 mb-4">
                    <span>发表于: {format(new Date(post.created_at * 1000), 'yyyy-MM-dd HH:mm:ss')}</span>
                    <div>{isOp && <span className="mr-2">楼主</span>}<span className="font-bold text-lg">#{floor}</span></div>
                </div>
                {hasQuote && ( <blockquote className="bg-[#F5FAFE] border border-[#E5EDF2] p-3 my-4 text-sm text-gray-600"> <p><strong>{post.quoted_author}</strong> 发表于 {format(new Date((post.quoted_created_at || 0) * 1000), 'yyyy-MM-dd HH:mm')}</p> <div className="mt-2" dangerouslySetInnerHTML={{ __html: post.quoted_body || '' }} /> </blockquote> )}
                <div className="prose prose-sm max-w-none text-base leading-relaxed" dangerouslySetInnerHTML={{ __html: post.body }} />
                <div className="text-right mt-4"><Button onClick={onQuote} size="sm" variant="ghost" className="text-xs text-gray-500 hover:text-gray-900">回复</Button></div>
            </div>
        </div>
    );
};

const QuickReplyForm = ({ threadId, onReplyPosted, quotingReply, clearQuoting }: { threadId: string, onReplyPosted: () => void, quotingReply: Reply | null, clearQuoting: () => void }) => {
    const { isAuthenticated, user } = useAuth();
    const [body, setBody] = useState('');
    const { toast } = useToast();
    
    const defaultAvatar = 'https://www.hostloc.com/uc_server/images/noavatar_middle.gif';
    const avatarUrl = user?.avatar_r2_key ? `/avatars/${user.avatar_r2_key}` : defaultAvatar;
    
    // **已修改**: 移除自动填充引用内容的 useEffect
    // useEffect(() => {
    //     if (quotingReply) {
    //         const quoteHtml = `<blockquote>...</blockquote><br/>`;
    //         setBody(quoteHtml);
    //     } else {
    //         setBody('');
    //     }
    // }, [quotingReply]);

    const handleSubmit = async () => {
        if (!body.trim() || body === '<br>') return;
        try {
            await apiClient.post(`/threads/${threadId}/replies`, { 
                body, 
                replyToId: quotingReply?.id 
            });
            toast({ title: "成功", description: "回复已发布。" });
            setBody('');
            clearQuoting();
            onReplyPosted();
        } catch (error) { /* ... */ }
    };

    if (!isAuthenticated) return null;

    return (
        <div className="border border-[#CDCDCD] rounded-sm flex mt-4">
            <div className="w-40 shrink-0 border-r border-[#E5EDF2] p-4 text-center text-xs bg-[#F5FAFE]">
                <a href="#" className="font-bold text-base text-[#336699]">{user?.username}</a>
                <div className="my-2">
                    <img src={avatarUrl} className="mx-auto w-full rounded-sm object-cover" alt="avatar" />
                </div>
            </div>
            <div className="w-full bg-white p-4">
                {quotingReply && ( <div className="bg-yellow-100 border-l-4 border-yellow-500 text-yellow-700 p-2 text-xs mb-2 rounded-sm">正在回复: <strong>{quotingReply.author_username}</strong> 的帖子 <button onClick={clearQuoting} className="float-right font-bold hover:text-black">取消</button></div> )}
                <RichTextEditor value={body} onChange={setBody} />
                <div className="mt-2"><Button onClick={handleSubmit} className="bg-[#0066CC] hover:bg-[#0055AA] text-white rounded-sm text-sm px-6 h-8 font-bold">发表回复</Button></div>
            </div>
        </div>
    );
};

// --- 主页面组件 ---
export default function ThreadPage() {
  const { threadId } = useParams<{ threadId: string }>();
  const [thread, setThread] = useState<Thread | null>(null);
  const [loading, setLoading] = useState(true);
  const [quotingReply, setQuotingReply] = useState<Reply | null>(null);
  const replyFormRef = useRef<HTMLDivElement>(null);

  const fetchThread = useCallback(async () => {
    if (!threadId) return;
    setLoading(true);
    try {
        const data = await apiClient.get<Thread>(`/threads/${threadId}`);
        setThread(data);
    } catch (error) { /* ... */ } 
    finally { setLoading(false); }
  }, [threadId]);

  useEffect(() => { fetchThread(); }, [fetchThread]);

  const handleSetQuoting = (reply: Reply) => {
      setQuotingReply(reply);
      replyFormRef.current?.scrollIntoView({ behavior: 'smooth', block: 'center' });
  };

  if (loading) return <div className="max-w-[960px] mx-auto text-center py-10">正在加载...</div>;
  if (!thread) return <div className="max-w-[960px] mx-auto text-center py-10">未找到该帖子。</div>;

  return (
    <div className="max-w-[960px] mx-auto w-full space-y-4">
      <h1 className="text-xl font-bold break-words">{thread.title}</h1>
      
      <Post post={thread} isOp={true} floor={1} onQuote={() => handleSetQuoting(thread as unknown as Reply)} />

      {thread.replies.map((reply, index) => (
          <Post key={reply.id} post={reply} floor={index + 2} onQuote={() => handleSetQuoting(reply)} />
      ))}
      
      <div ref={replyFormRef}>
        <QuickReplyForm 
            threadId={threadId!} 
            onReplyPosted={fetchThread} 
            quotingReply={quotingReply} 
            clearQuoting={() => setQuotingReply(null)}
        />
      </div>
    </div>
  );
}
