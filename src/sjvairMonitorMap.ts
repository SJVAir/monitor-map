import { initialize } from "./App";

const materialSymbolsTag = '<link rel="stylesheet" href="https://fonts.googleapis.com/css2?family=Material+Symbols+Outlined:opsz,wght,FILL,GRAD@20..48,100..700,0..1,-50..200" />';
document.head.innerHTML = `${ document.head.innerHTML }\n${ materialSymbolsTag }`

initialize();
