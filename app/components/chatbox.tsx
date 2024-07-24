"use client"
import { useCallback, useEffect, useRef, useState } from "react";
import "./styles.css"
import { socket } from "../socket";

interface IChatList{
  id: number;
  text: string;
};

const TEXT = {
  TypeSomething: "Type something here",
};

export default function ChatBox() {
  const [chatList, setChatList] = useState<IChatList[]>([]);
  const [inputText, setInputText] = useState("");
  const onChangeInput = (e: any) => {
    setInputText(e.target.value);
  };
  const lastDivRef = useRef<any>();
  const isLastDivVisible = useRef(false);
  const onSubmitInput = useCallback((e: any) => {
    e.preventDefault();
    if(!e.target.value){
      return;
    }
    socket.emit("chat-message",e.target.value);
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

  useEffect(() => {
    if(isLastDivVisible.current) {
      lastDivRef.current.scrollIntoView();
    }
  }, [chatList]);

  useEffect(() => {
    const observer = new IntersectionObserver(([entry]) => {
      isLastDivVisible.current = entry.isIntersecting;
    });
    observer.observe(lastDivRef.current);
    return () => {
      observer.disconnect();
    }
  }, []);

  useEffect(() => {
    socket.connect();
    return () => {
      socket.disconnect();
    }
  }, []);

  useEffect(() => {
    const onSocketConnect = () => {
      console.log(socket.id);
    };
    socket.on('connect', onSocketConnect);
    return () => {
      socket.off('connect', onSocketConnect);
    }
  }, []);

  return (
    <div className="chatbox">
      <div className="chat-list-container">
        {
          chatList.map((item) => {
            return <div key={item.id} className="chat-item">{item.text}</div>;
          })
        }
        <div ref={lastDivRef}/>
      </div>
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