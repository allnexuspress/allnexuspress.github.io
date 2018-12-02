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
	$loading.forEach(elem => elem.classList.add('ready'));
	$nav.classList.add('ready');
};

const scrollToTop = () => {
	let top = document.getElementById('anchor-target');
	top.scrollIntoView({behavior: "smooth", block: "start"});
};

export { debounce, hideLoading, scrollToTop };