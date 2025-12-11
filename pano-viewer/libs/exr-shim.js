import * as THREE_MODULE from './three.module.js';
import { EXRLoader } from './EXRLoader.fix.js';

window.THREE = window.THREE || THREE_MODULE;
window.createEXRLoader = () => new EXRLoader();
window.getEXRLoaderClass = () => EXRLoader;
window.dispatchEvent(new Event('threeJSReady'));
