const DB = 'https://nexus-catalog.firebaseio.com/posts.json?auth=7g7pyKKykN3N5ewrImhOaS6vwrFsc5fKkrk8ejzf';
const alphabet = ['a', 'b', 'c', 'd', 'e', 'f', 'g', 'h', 'i', 'j', 'k', 'l', 'm', 'n', 'o', 'p', 'r', 's', 't', 'u', 'v', 'w', 'y', 'z'];

const $loading = Array.from(document.querySelectorAll('.loading'));
const $nav = document.getElementById('js-nav');
const $parallax = document.querySelector('.parallax');
const $content = document.querySelector('.content');
const $title = document.getElementById('js-title');
const $arrow = document.querySelector('.arrow');
const $modal = document.querySelector('.modal');
const $lightbox = document.querySelector('.lightbox');
const $view = document.querySelector('.lightbox-view');

export { 
	DB, 
	alphabet, 
	$loading, 
	$nav, 
	$parallax,
	$content,
	$title,
	$arrow,
	$modal,
	$lightbox,
	$view 
};