import {useEffect, useRef} from 'react'
import {OrthosliceViewer} from './OrthosliceViewer.ts';
import './App.css'

function App() {
  return <>
    <LinkedOrthoSliceView/>
  </>
}

// where should this be initialised?
const orthosliceViewer = new OrthosliceViewer();
orthosliceViewer.init();

function LinkedOrthoSliceView() {
  const parent = useRef<any>();

  useEffect(() => {
    async function mount() {
      await orthosliceViewer.initialized;
      orthosliceViewer.mount(parent.current);
    }

    mount();
    return () => {
      // mount/unmount needs to be a queue because of asynchronous calls
      orthosliceViewer.unmount();
    };
  }, []);

  return (
    <div ref={parent} style={{position: 'absolute', inset: 0, bottom: 50}}/>
  )
}

export default App
