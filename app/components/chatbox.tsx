"use client"
import { useCallback, useState } from "react";
import "./styles.css"

interface IChatList{
  id: number;
  text: string;
};

const TEXT = {
  TypeSomething: "Type Something here",
};

export default function ChatBox() {
  const [chatList, setChatList] = useState<IChatList[]>([]);
  const [inputText, setInputText] = useState("");
  const onChangeInput = (e: any) => {
    setInputText(e.target.value);
  };
  const onSubmitInput = useCallback((e: any) => {
    e.preventDefault();
    if(!e.target.value){
      return;
    }
    let newId = 0;
    if(chatList.length > 0) {
      newId = chatList[chatList.length - 1].id + 1;
    }
    setChatList([...chatList, {
      id: newId,
      text: e.target.value,
    }])
    setInputText("");
  }, [chatList]);

  const onKeyDown = useCallback((e: any) => {
    if(e.key === "Enter") {
      onSubmitInput(e);
    }
  }, [onSubmitInput]);

  return (
    <div className="chatbox">
    {
      chatList.map((item) => {
        return <text key={item.id} className="chat-item">{item.text}</text>;
      })
    }
      <input 
        type="text"
        className="inputbox"
        value={inputText}
        placeholder={TEXT.TypeSomething}
        onChange={onChangeInput}
        onKeyDown={onKeyDown}
      />
    </div>
  );
}