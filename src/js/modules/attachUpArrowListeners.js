import { $title, $parallax, $upArrow } from '../constants';
import { scrollToTop } from '../utils';

let prev;
let current = 0;
let isShowing = false;

const attachUpArrowListeners = () => {
	$parallax.addEventListener('scroll', () => {
		let y = $title.getBoundingClientRect().y;

		if (current !== y) {
			prev = current;
			current = y;
		};

		if (y <= -50 && !isShowing) {
			$upArrow.classList.add('show');
			isShowing = true;
		} else if (y > -50 && isShowing) {
			$upArrow.classList.remove('show');
			isShowing = false;
		}
	});

	$upArrow.addEventListener('click', () => scrollToTop());
};

export default attachUpArrowListeners;