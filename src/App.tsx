import { useEffect, useState, useRef } from "react";
import useASCII3DRenderer from "../src/engines/renderer";
import useLoader from "../src/engines/loader";
import "./App.scss";

function App() {
  const { frameBuffer, convertFrameBufferToString } = useASCII3DRenderer(120, 50);
  useLoader();
  const renderWindowRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (renderWindowRef.current) {
      renderWindowRef.current.innerHTML = convertFrameBufferToString();
    }
  }, [frameBuffer]);
  return (
    <>
      <div className="window" ref={renderWindowRef}></div>
    </>
  );
}

export default App;
