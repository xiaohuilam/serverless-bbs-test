import React, { useState, useRef, useEffect } from 'react'; // 1. 引入 useEffect
import { Button } from '@/components/ui/button';
import { Bold, Italic, Link, Smile } from 'lucide-react';

const EMOJIS = ['😀', '😂', '😍', '🤔', '👍', '🙏', '🎉', '🔥', '💯', '😊', '😭', '🚀'];

interface RichTextEditorProps {
  value: string;
  onChange: (html: string) => void;
  placeholder?: string;
}

export const RichTextEditor: React.FC<RichTextEditorProps> = ({ value, onChange, placeholder }) => {
  const editorRef = useRef<HTMLDivElement>(null);
  const [showEmojis, setShowEmojis] = useState(false);

  // 2. 新增修复: 组件加载时自动聚焦，强制将光标置于左侧
  // useEffect(() => {
  //   editorRef.current?.focus();
  // }, []);


  const handleInput = () => {
    if (editorRef.current) {
      onChange(editorRef.current.innerHTML);
    }
  };

  const handleCommand = (command: string) => {
    document.execCommand(command, false);
    editorRef.current?.focus();
  };

  const handleInsertEmoji = (emoji: string) => {
    editorRef.current?.focus();
    document.execCommand('insertText', false, emoji);
    setShowEmojis(false);
  };
  
  return (
    <div className="border border-[#CDCDCD] rounded-sm bg-white">
      {/* Toolbar */}
      <div className="flex items-center p-2 border-b border-[#E5EDF2] bg-[#F5FAFE] space-x-1 relative">
        <Button type="button" size="sm" variant="ghost" className="h-6 w-6 p-1" onClick={() => handleCommand('bold')}><Bold size={16} /></Button>
        <Button type="button" size="sm" variant="ghost" className="h-6 w-6 p-1" onClick={() => handleCommand('italic')}><Italic size={16} /></Button>
        <Button type="button" size="sm" variant="ghost" className="h-6 w-6 p-1" onClick={() => {
            const url = prompt('输入链接 URL:');
            if (url) document.execCommand('createLink', false, url);
        }}><Link size={16} /></Button>
        <Button type="button" size="sm" variant="ghost" className="h-6 w-6 p-1" onClick={() => setShowEmojis(!showEmojis)}><Smile size={16} /></Button>
        
        {/* Emoji Picker */}
        {showEmojis && (
          <div className="absolute top-full left-0 mt-1 bg-white border border-[#CDCDCD] shadow-lg rounded-sm p-2 grid grid-cols-6 gap-1 z-10">
            {EMOJIS.map(emoji => (
              <button key={emoji} type="button" className="text-xl p-1 rounded-sm hover:bg-gray-200" onClick={() => handleInsertEmoji(emoji)}>
                {emoji}
              </button>
            ))}
          </div>
        )}
      </div>
      
      {/* Editable Area */}
      <div
        ref={editorRef}
        contentEditable
        onInput={handleInput}
        className="w-full p-3 min-h-[120px] text-base focus:outline-none"
        dangerouslySetInnerHTML={{ __html: value }}
        // 可选: 为空状态添加一个占位符效果
        data-placeholder={placeholder}
        style={{ emptyCells: 'show' }}
      />
    </div>
  );
};
