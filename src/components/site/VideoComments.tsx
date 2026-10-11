import { useRef, useState } from 'react';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { useServerFn } from '@tanstack/react-start';
import { Link } from '@tanstack/react-router';
import { ThumbsUp, ThumbsDown, MoreHorizontal, ArrowDownWideNarrow, LoaderCircle } from 'lucide-react';
import { formatDistanceToNow } from 'date-fns';
import { useAuth } from '@/lib/auth-context';
import { SignedImg } from '@/components/ui/signed-img';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from '@/components/ui/dropdown-menu';
import { commentText, getVideoEngagement, postVideoComment, editVideoComment, deleteVideoComment, setCommentReaction, type VideoComment } from '@/lib/video-engagement.functions';

export function CommentAvatar({ src, name }: { src?: string | null; name: string }) {
  return <div className="flex h-10 w-10 shrink-0 items-center justify-center overflow-hidden rounded-full border border-border bg-secondary text-sm font-semibold text-primary">{src ? <SignedImg src={src} alt={name} className="h-full w-full object-cover" /> : name.slice(0,1).toUpperCase()}</div>;
}

function Composer({ videoId, parentId=null, initial='', editId, onDone }: { videoId: string; parentId?: string | null; initial?: string; editId?: string; onDone: () => void }) {
  const [body,setBody]=useState(initial), [busy,setBusy]=useState(false), [error,setError]=useState('');
  const locked=useRef(false), requestId=useRef<string | null>(null);
  const post=useServerFn(postVideoComment), edit=useServerFn(editVideoComment);
  async function submit() {
    if(locked.current)return;
    const parsed=commentText.safeParse(body);
    if(!parsed.success){setError(parsed.error.issues[0]?.message ?? 'Invalid comment');return;}
    locked.current=true;setBusy(true);setError('');
    try {
      if(editId)await edit({data:{id:editId,body:parsed.data}});
      else {requestId.current ??= crypto.randomUUID(); await post({data:{id:requestId.current,videoId,parentId,body:parsed.data}});}
      setBody(''); requestId.current=null; onDone();
    } catch(e) {console.error('[video comment]',e);setError(e instanceof Error ? e.message : 'Could not save your comment. Please try again.');}
    finally{locked.current=false;setBusy(false);}
  }
  return <div className="min-w-0 flex-1"><Textarea aria-label={editId ? 'Edit comment' : parentId ? 'Write a reply' : 'Add a comment'} placeholder={parentId ? 'Write a reply…' : 'Add a comment…'} maxLength={2000} rows={2} value={body} onChange={e=>{setBody(e.target.value);requestId.current=null;}} className="min-h-14 resize-y border-0 border-b border-border bg-transparent p-2 focus-visible:ring-primary/40" />
    {error && <p role="alert" className="mt-2 break-words text-sm text-destructive">{error}</p>}
    <div className="mt-2 flex justify-end"><Button size="sm" disabled={busy || !body.trim()} onClick={()=>void submit()}>{busy && <LoaderCircle className="animate-spin" />}{editId ? 'Save changes' : parentId ? 'Reply' : 'Post'}</Button></div>
  </div>;
}

function CommentRow({ comment:c, videoId, refresh, isReply=false }: { comment: VideoComment; videoId:string; refresh:()=>void; isReply?:boolean }) {
  const {user,roles}=useAuth();
  const [reply,setReply]=useState(false),[editing,setEditing]=useState(false),[expanded,setExpanded]=useState(false),[limit,setLimit]=useState(20),[busy,setBusy]=useState(false),[error,setError]=useState('');
  const react=useServerFn(setCommentReaction), remove=useServerFn(deleteVideoComment), fetch=useServerFn(getVideoEngagement);
  const qc=useQueryClient();
  const replies=useQuery({queryKey:['video-engagement',videoId,'replies',c.id,limit],enabled:expanded,queryFn:async()=>{
    const pages=await Promise.all(Array.from({length:Math.ceil(limit/20)},(_,i)=>fetch({data:{videoId,sort:'newest',offset:i*20,parentId:c.id}})));
    return {comments:pages.flatMap(p=>p.comments),total:pages[0]?.pageTotal??0};
  }});
  const update=()=>{refresh();void qc.invalidateQueries({queryKey:['video-engagement',videoId]});};
  const action=async(work:()=>Promise<unknown>)=>{if(busy)return;setBusy(true);setError('');try{await work();update();}catch(e){console.error('[video engagement]',e);setError('Could not save this action. Please try again.');}finally{setBusy(false);}};
  return <article className="flex min-w-0 gap-3 py-5">
    <CommentAvatar src={c.avatar_url} name={c.display_name || c.username || 'Listener'} />
    <div className="min-w-0 flex-1">
      <div className="flex flex-wrap items-baseline gap-x-2 gap-y-1"><Link to="/artist/$id" params={{id:c.user_id}} className="text-sm font-semibold hover:text-primary">@{c.username || c.display_name || 'Listener'}</Link><span className="text-xs text-muted-foreground">{formatDistanceToNow(new Date(c.created_at),{addSuffix:true})}{c.updated_at!==c.created_at ? ' · edited' : ''}</span>
        {(user?.id===c.user_id || roles.includes('admin')) && <DropdownMenu><DropdownMenuTrigger asChild><Button size="icon" variant="ghost" aria-label="Comment options" className="ml-auto h-7 w-7"><MoreHorizontal /></Button></DropdownMenuTrigger><DropdownMenuContent align="end">
          {user?.id===c.user_id && <DropdownMenuItem onSelect={()=>setEditing(true)}>Edit</DropdownMenuItem>}
          <DropdownMenuItem onSelect={()=>{if(confirm('Delete this comment and its replies?'))void action(()=>remove({data:{id:c.id}}));}}>Delete</DropdownMenuItem>
        </DropdownMenuContent></DropdownMenu>}
      </div>
      {editing ? <><Composer videoId={videoId} editId={c.id} initial={c.body} onDone={()=>{setEditing(false);update();}} /><Button variant="ghost" size="sm" onClick={()=>setEditing(false)}>Cancel</Button></> : <p className="mt-2 whitespace-pre-wrap break-words text-sm leading-relaxed text-foreground/90">{c.body}</p>}
      <div className="mt-2 flex items-center gap-1">
        <Button size="sm" variant="ghost" disabled={busy || !user} aria-label="Like comment" aria-pressed={c.reaction==='like'} className={c.reaction==='like' ? 'text-primary' : 'text-muted-foreground'} onClick={()=>void action(()=>react({data:{commentId:c.id,reaction:c.reaction==='like'?null:'like'}}))}><ThumbsUp />{c.likes || ''}</Button>
        <Button size="sm" variant="ghost" disabled={busy || !user} aria-label="Dislike comment" aria-pressed={c.reaction==='dislike'} className={c.reaction==='dislike' ? 'text-primary' : 'text-muted-foreground'} onClick={()=>void action(()=>react({data:{commentId:c.id,reaction:c.reaction==='dislike'?null:'dislike'}}))}><ThumbsDown />{c.dislikes || ''}</Button>
        {!isReply && <Button size="sm" variant="ghost" onClick={()=>setReply(!reply)}>Reply</Button>}
      </div>
      {error && <p role="alert" className="text-sm text-destructive">{error}</p>}
      {reply && (user ? <Composer videoId={videoId} parentId={c.id} onDone={()=>{setReply(false);setExpanded(true);update();}} /> : <Button asChild variant="link"><Link to="/auth">Sign in to reply</Link></Button>)}
      {!isReply && c.replies>0 && <Button size="sm" variant="ghost" className="text-primary" onClick={()=>setExpanded(!expanded)}>{expanded ? 'Hide' : 'View'} {c.replies} {c.replies===1?'reply':'replies'}</Button>}
      {expanded && <div>{replies.isLoading && <LoaderCircle className="animate-spin" />}{replies.error && <p className="text-sm text-destructive">Replies could not load.</p>}{replies.data?.comments.map(r=><CommentRow key={r.id} comment={r} videoId={videoId} refresh={update} isReply />)}{(replies.data?.total??0)>limit && <Button variant="ghost" onClick={()=>setLimit(limit+20)}>Load more replies</Button>}</div>}
    </div>
  </article>;
}

export function VideoComments({videoId}:{videoId:string}) {
  const {user,displayName,avatarUrl}=useAuth();
  const [sort,setSort]=useState<'top'|'newest'>('top'),[limit,setLimit]=useState(20);
  const fetch=useServerFn(getVideoEngagement), qc=useQueryClient();
  const query=useQuery({queryKey:['video-engagement',videoId,'comments',sort,limit],enabled:!!user,refetchInterval:30000,queryFn:async()=>{
    const pages=await Promise.all(Array.from({length:Math.ceil(limit/20)},(_,i)=>fetch({data:{videoId,sort,offset:i*20,parentId:null}})));
    return {...pages[0],comments:pages.flatMap(p=>p.comments)};
  }});
  const refresh=()=>{void qc.invalidateQueries({queryKey:['video-engagement',videoId]});};
  return <section className="mt-8 border-t border-border pt-7">
    <header className="grid grid-cols-[minmax(0,1fr)_auto] items-center gap-3"><h2 className="text-xl font-semibold">Comments <span className="ml-1 text-muted-foreground">{query.data?.total??0}</span></h2><DropdownMenu><DropdownMenuTrigger asChild><Button variant="ghost" className="text-sm"><ArrowDownWideNarrow />{sort==='top'?'Top':'Newest'}</Button></DropdownMenuTrigger><DropdownMenuContent align="end"><DropdownMenuItem onSelect={()=>{setSort('top');setLimit(20);}}>Top</DropdownMenuItem><DropdownMenuItem onSelect={()=>{setSort('newest');setLimit(20);}}>Newest</DropdownMenuItem></DropdownMenuContent></DropdownMenu></header>
    <div className="my-6 flex gap-3">{user ? <><CommentAvatar src={avatarUrl} name={displayName} /><Composer videoId={videoId} onDone={refresh} /></> : <Button asChild variant="outline"><Link to="/auth">Sign in to comment</Link></Button>}</div>
    {query.isLoading && <p className="flex items-center gap-2 text-muted-foreground"><LoaderCircle className="animate-spin" size={16}/>Loading comments…</p>}
    {query.error && <div role="alert"><p className="text-destructive">Comments could not load.</p><Button variant="ghost" onClick={()=>void query.refetch()}>Try again</Button></div>}
    {query.data?.comments.length===0 && <p className="py-8 text-sm text-muted-foreground">No comments yet.</p>}
    <div className="divide-y divide-border/60">{query.data?.comments.map(c=><CommentRow key={c.id} comment={c} videoId={videoId} refresh={refresh}/>)}</div>
    {(query.data?.pageTotal??0)>limit && <Button variant="outline" className="mt-4" onClick={()=>setLimit(limit+20)}>Load more comments</Button>}
  </section>;
}