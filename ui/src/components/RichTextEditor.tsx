import React, { useRef, useState } from 'react';
import { apiClient } from '@/lib/api';
import { useToast } from './ui/use-toast';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Button } from './ui/button';
import { 
    Bold, Italic, Underline, Strikethrough, Link as LinkIcon, Pilcrow,
    Palette, AlignLeft, AlignCenter, AlignRight, List, ListOrdered,
    Image as ImageIcon, Paperclip, Smile, Code, Table, AtSign, Maximize, Minus, Plus
} from 'lucide-react';

// 编辑器按钮的辅助组件
const ToolbarButton = ({ children, onClick, tip }: { children: React.ReactNode; onClick?: () => void; tip: string }) => (
    <Button type="button" size="icon" variant="ghost" className="h-6 w-6 p-1" onClick={onClick} title={tip}>
        {children}
    </Button>
);

export const RichTextEditor = ({ value, onChange }: { value: string, onChange: (html: string) => void }) => {
    const editorRef = useRef<HTMLDivElement>(null);
    const imageInputRef = useRef<HTMLInputElement>(null);
    const attachmentInputRef = useRef<HTMLInputElement>(null);
    const { toast } = useToast();

    const execCmd = (cmd: string, val?: string) => {
        document.execCommand(cmd, false, val);
        editorRef.current?.focus();
    };

    const handleFileUpload = async (file: File, type: 'image' | 'attachment') => {
        const formData = new FormData();
        formData.append(type, file);
        const endpoint = type === 'image' ? '/images' : '/attachments';
        
        try {
            const res = await apiClient.postFormData<{ url: string, fileName?: string }>(endpoint, formData);
            if (type === 'image') {
                execCmd('insertHTML', `<img src="${res.url}" style="max-width: 100%;" />`);
            } else {
                execCmd('insertHTML', `<a href="${res.url}" target="_blank" download>${res.fileName || '下载附件'}</a>`);
            }
        } catch (error: any) {
            toast({ title: "上传失败", description: error.message, variant: "destructive" });
        }
    };

    return (
        <div className="border border-gray-300 rounded-sm bg-white">
            <div className="flex items-center justify-between p-1 border-b border-gray-200 bg-gray-50 flex-wrap">
                <div className="flex items-center flex-wrap">
                    {/* 第一行工具栏 */}
                    <Select onValueChange={(val) => execCmd('formatBlock', val)}><SelectTrigger className="w-20 h-6 text-xs mr-1"><SelectValue placeholder="大小" /></SelectTrigger><SelectContent>{[1,2,3,4,5,6].map(h => <SelectItem key={h} value={`h${h}`}>H{h}</SelectItem>)}</SelectContent></Select>
                    <div className="h-4 border-l mx-1"></div>
                    <ToolbarButton onClick={() => execCmd('bold')} tip="加粗"><Bold size={16}/></ToolbarButton>
                    <ToolbarButton onClick={() => execCmd('italic')} tip="斜体"><Italic size={16}/></ToolbarButton>
                    <ToolbarButton onClick={() => execCmd('underline')} tip="下划线"><Underline size={16}/></ToolbarButton>
                    <ToolbarButton onClick={() => execCmd('strikethrough')} tip="删除线"><Strikethrough size={16}/></ToolbarButton>
                    <ToolbarButton onClick={() => {/* Color Picker Logic */}} tip="颜色"><Palette size={16}/></ToolbarButton>
                    <div className="h-4 border-l mx-1"></div>
                    <ToolbarButton onClick={() => execCmd('justifyLeft')} tip="居左"><AlignLeft size={16}/></ToolbarButton>
                    <ToolbarButton onClick={() => execCmd('justifyCenter')} tip="居中"><AlignCenter size={16}/></ToolbarButton>
                    <ToolbarButton onClick={() => execCmd('justifyRight')} tip="居右"><AlignRight size={16}/></ToolbarButton>
                    <ToolbarButton onClick={() => execCmd('insertUnorderedList')} tip="无序列表"><List size={16}/></ToolbarButton>
                    <ToolbarButton onClick={() => execCmd('insertOrderedList')} tip="有序列表"><ListOrdered size={16}/></ToolbarButton>
                    <div className="h-4 border-l mx-1"></div>
                    <ToolbarButton onClick={() => {/* Emoji Logic */}} tip="表情"><Smile size={16}/></ToolbarButton>
                    <ToolbarButton onClick={() => imageInputRef.current?.click()} tip="图片"><ImageIcon size={16}/></ToolbarButton>
                    <ToolbarButton onClick={() => attachmentInputRef.current?.click()} tip="附件"><Paperclip size={16}/></ToolbarButton>
                    <ToolbarButton onClick={() => {/* Table Logic */}} tip="表格"><Table size={16}/></ToolbarButton>
                </div>
                <div className="flex items-center">
                     <Button variant="link" size="sm" className="text-xs text-gray-500">全屏</Button>
                </div>
            </div>
            
            <div ref={editorRef} contentEditable onInput={() => onChange(editorRef.current?.innerHTML || '')} className="p-3 min-h-[200px] focus:outline-none text-base" />
            
            <input type="file" accept="image/*" ref={imageInputRef} onChange={(e) => e.target.files && handleFileUpload(e.target.files[0], 'image')} className="hidden" />
            <input type="file" ref={attachmentInputRef} onChange={(e) => e.target.files && handleFileUpload(e.target.files[0], 'attachment')} className="hidden" />

            <div className="text-xs text-gray-400 p-2 border-t border-gray-200 bg-gray-50 text-right">
                <a href="#" className="hover:underline">加大编辑框</a> | <a href="#" className="hover:underline">缩小编辑框</a>
            </div>
        </div>
    );
};
