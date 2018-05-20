const template =
	`<div class="mobile-controls__inner">
			<h1 class="mobile-controls__title">Nexus Press</h1>
			<button class="mobile-controls__menu-open-outer" id="js-mobile-nav">
					<i class="mobile-controls__menu-open fas fa-angle-down" id="js-angle-icon"></i>
			</button>
	</div>`

const mobileNav = () => {
	let outer = document.getElementById('js-nav-mobile');
	outer.innerHTML = template;
};

export default mobileNav;
