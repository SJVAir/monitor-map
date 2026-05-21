// CSS transforms create a new containing block for `position: fixed` descendants.
// Use this action to move a node to document.body, escaping any transformed ancestor.
export function portal(node: HTMLElement) {
	document.body.appendChild(node);
	return {
		destroy() {
			node.remove();
		}
	};
}
