const imageTemplate = (image) => `
<div class="article-image__outer">
	<img class="article-image" src="../../assets/images/${image}"></img>
</div>
`;

const articleTemplate = (entry, i) => {
	const { title, firstName, lastName, images, description, contents, dimensions, year, isbn, oclc, link } = entry;

	const imageHTML = images.length ? 
		images.map(image => imageTemplate(image)).join('') : '';

	return  `
		<article class="article__outer">
			<div class="article__inner">
				<div class="article__heading">
					<a class="js-entry-title"></a>
					<h2 class="article-heading__title">${title}</h2>
					<div class="article-heading__name">
						<span class="article-heading__name--first">${firstName}</span>
						<a class="js-entry-artist"></a>
						<span class="article-heading__name--last">${lastName}</span>
					</div>
				</div>	
				<div class="article__slider-outer">
					<div class="article__slider-inner" id="slider-${i}">
						${imageHTML}
						<div class="article-description__outer">
							<div class="article-description">${description}</div>
							<div class="article-detail">${contents}</div>
							<div class="article-detail article-detail--margin">${dimensions}</div>
							<div class="article-detail article-detail--margin">${year}</div>
							<div class="article-detail article-detail--margin">${isbn}</div>
							<div class="article-detail">OCLC <a class="article-detail--link" target="_blank" href="${link}">${oclc}</a></div>
						</div>
					</div>
					<div class="article__scroll-controls">
						<span class="controls arrow-prev">←</span> 
						<span class="controls arrow-next">→</span>
					</div>
					<p class="js-article-anchor-target"></p>
			</div>
		</article>
	`
};

export default articleTemplate;