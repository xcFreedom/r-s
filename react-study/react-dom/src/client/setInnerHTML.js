import createMicrosoftUnsafeLocalFunction from '../shared/createMicrosoftUnsafeLocalFunction';
import { Namespaces } from '../shared/DOMNamespaces';

// SVG temp container for IE lacking innerHTML
let reusableSVGContainer;

const setInnerHTML = createMicrosoftUnsafeLocalFunction(function(node, html) {
  if (node.namespaceURI === Namespaces.svg) {
    if (!('innerHTML' in node)) {
      reusableSVGContainer = reusableSVGContainer || document.createElement('div');
      reusableSVGContainer.innerHTML = '<svg>' + html.valueOf().toString() + '</svg>';
      const svgNode = reusableSVGContainer.firstChild;
      while (node.firstChild) {
        node.removeChild(node.firstChild);
      }
      while (svgNode.firstChild) {
        node.appendChild(svgNode.firstChild);
      }
      return;
    }
  }
  node.innerHTML = html;
});

export default setInnerHTML;