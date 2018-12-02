const DB = 'https://nexus-catalog.firebaseio.com/posts.json?auth=7g7pyKKykN3N5ewrImhOaS6vwrFsc5fKkrk8ejzf';

const $loading = Array.from(document.querySelectorAll('.loading'));
const $articleList = document.getElementById('js-list');
const $nav = document.getElementById('js-nav');
const $parallax = document.querySelector('.parallax');
const $content = document.querySelector('.content');
const $title = document.getElementById('js-title');
const $upArrow = document.getElementById('js-arrow');
const $modal = document.querySelector('.modal');
const $lightbox = document.querySelector('.lightbox');
const $view = document.querySelector('.lightbox-view');
const sortIds = ['artist', 'title'];

export { 
	DB,
	$loading,
	$articleList, 
	$nav, 
	$parallax,
	$content,
	$title,
	$upArrow,
	$modal,
	$lightbox,
	$view,
	sortIds
};