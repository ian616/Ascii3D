import { useEffect, useRef, useState } from "react";
import useASCII3DRenderer from "../src/engines/cpu/renderer";
import useWebGPUASCII3DRenderer from "../src/engines/webGPU/renderer";
import "./App.scss";

function App() {
    /** webGPU setting part*/
    const [device, setDevice] = useState<GPUDevice | null>(null);
    useEffect(() => {
        (async () => {
            if (!navigator.gpu) {
                console.error("WebGPU is not supported in this browser.");
                return;
            }

            const adapter = await navigator.gpu.requestAdapter();
            if (!adapter) {
                console.error("Failed to get GPU adapter.");
                return;
            }

            const dev = await adapter.requestDevice();
            setDevice(dev);
        })();
    }, []);

    // const { frameBuffer, convertFrameBufferToString } = useASCII3DRenderer(120, 50);
    const { frameBuffer, convertFrameBufferToString } =
        useWebGPUASCII3DRenderer(device!, 120, 50);

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
