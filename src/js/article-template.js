const articleTemplate = `
	<article class="article__outer">
		<div class="article__inner">
			<div class="article__heading">
				<a class="js-entry-title"></a>
				<h2 class="article-heading__title"></h2>
				<div class="article-heading__name">
					<span class="article-heading__name--first"></span>
					<a class="js-entry-artist"></a>
					<span class="article-heading__name--last"></span>
				</div>
			</div>	
			<div class="article__slider-outer">
				<div class="article__slider-inner"></div>
				<div class="article__scroll-controls">
					<span class="controls arrow-prev">←</span> 
					<span class="controls arrow-next">→</span>
				</div>
				<p class="js-article-anchor-target"></p>
		</div>
	</article>
`;

export default articleTemplate;