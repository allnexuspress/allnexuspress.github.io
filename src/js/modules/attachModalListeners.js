import { $modal } from '../constants';

let modal = false;
const attachModalListeners = () => {
	const $find = document.getElementById('js-find');
	
	$find.addEventListener('click', () => {
		$modal.classList.add('show');
		modal = true;
	});

	$modal.addEventListener('click', () => {
		$modal.classList.remove('show');
		modal = false;
	});

	window.addEventListener('keydown', () => {
		if (modal) {
			setTimeout(() => {
				$modal.classList.remove('show');
				modal = false;
			}, 600);
		};
	});
};

export default attachModalListeners;