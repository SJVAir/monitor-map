export class SingleEventListener {
  constructor(type: string, handler: (args?: any) => void) {
    const handle = () => {
      handler();
      window.removeEventListener(type, handle);
    };
    window.addEventListener(type, handle);
  }
}
