import { useEffect, useState, useRef } from "react";
import  useASCII3DRenderer  from "../src/engines/renderer";
import "./App.scss";

function App() {
  const {frameBuffer} = useASCII3DRenderer(10, 10);
  const renderWindowRef = useRef<HTMLDivElement>(null);

  useEffect(()=>{
    if(renderWindowRef.current && frameBuffer){

      let temp = '';
      frameBuffer.forEach((row)=>{
        row.forEach((char)=>{
          temp += char;
        })
        temp += '<br/>';
      });
      renderWindowRef.current.innerHTML = temp;
      
    }
  }, [frameBuffer])
  return (
    <>
      <div className="window" ref={renderWindowRef}></div>
    </>
  );
}

export default App;
