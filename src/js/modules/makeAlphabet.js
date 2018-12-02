const alphabet = ['a', 'b', 'c', 'd', 'e', 'f', 'g', 'h', 'i', 'j', 'k', 'l', 'm', 'n', 'o', 'p', 'r', 's', 't', 'u', 'v', 'w', 'y', 'z'];

const makeAlphabet = (sortKey) => {
	const findFirstEntry = (char) => {
		const selector = sortKey ? '.js-entry-title' : '.js-entry-artist';
		const prevSelector = !sortKey ? '.js-entry-title' : '.js-entry-artist';

		const $entries = Array.from(document.querySelectorAll(selector));
		const $prevEntries = Array.from(document.querySelectorAll(prevSelector));

		$prevEntries.forEach(entry => entry.removeAttribute('name'));

		return $entries.find(entry => {
			let node = entry.nextElementSibling;
			return node.innerHTML[0] === char || node.innerHTML[0] === char.toUpperCase();
		});
	};

	const attachAnchorListener = ($anchor, letter) => {
		$anchor.addEventListener('click', () => {
			const letterNode = document.getElementById(letter);
			let target;

			if (!sortKey) {
				target = letter === 'a' ? document.getElementById('anchor-target') : letterNode.parentElement.parentElement.parentElement.parentElement.previousElementSibling.querySelector('.js-article-anchor-target');
			} else {
				target = letter === 'a' ? document.getElementById('anchor-target') : letterNode.parentElement.parentElement.parentElement.previousElementSibling.querySelector('.js-article-anchor-target');
			};

			target.scrollIntoView({behavior: "smooth", block: "start"});
		});
	};

	let activeEntries = {};
	let $outer = document.querySelector('.alphabet__letters');
	$outer.innerHTML = '';

	alphabet.forEach(letter => {
		let $firstEntry = findFirstEntry(letter);
		let $anchor = document.createElement('a');

		if (!$firstEntry) return;

		$firstEntry.id = letter;
		$anchor.innerHTML = letter.toUpperCase();
		$anchor.className = 'alphabet__letter-anchor';

		attachAnchorListener($anchor, letter);
		$outer.appendChild($anchor);
	});
};

export default makeAlphabet;