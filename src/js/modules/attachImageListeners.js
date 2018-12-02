import { $view, $lightbox } from '../constants';

let lightbox = false;

const attachImageListeners = () => {
	const $images = Array.from(document.querySelectorAll('.article-img'));

	$images.forEach(img => {
		img.addEventListener('click', (evt) => {
			if (!lightbox) {
				let src = img.src;
				
				$lightbox.classList.add('show-img');
				$view.setAttribute('style', `background-image: url(${src})`);
				lightbox = true;
			}
		});
	});

	$view.addEventListener('click', () => {
		if (lightbox) {
			$lightbox.classList.remove('show-img');
			lightbox = false;
		}
	});
};

export default attachImageListeners;