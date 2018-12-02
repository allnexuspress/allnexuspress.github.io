import { $loading, $nav, $parallax, $content, $title, $arrow, $modal, $lightbox, $view } from '../constants';

const debounce = (fn, time) => {
  let timeout;

  return function() {
    const functionCall = () => fn.apply(this, arguments);
    
    clearTimeout(timeout);
    timeout = setTimeout(functionCall, time);
  }
};

const hideLoading = () => {
	$loading.forEach(elem => {
		elem.classList.remove('loading');
		elem.classList.add('ready');
	});
	$nav.classList.add('ready');
};

export { debounce, hideLoading };