const gulp = require('gulp');
const sass = require('gulp-sass');
const babel = require('gulp-babel');
const autoprefixer = require('gulp-autoprefixer');
const sourcemaps = require('gulp-sourcemaps');
const browserSync = require('browser-sync').create();

gulp.task('build', () => {
	return gulp
		.src('scss/**/*.scss')
		.pipe(sourcemaps.init())
		.pipe(sass({ outputStyle: 'expanded' })
			.on('error', sass.logError))
		.pipe(autoprefixer({ browsers: ['last 2 versions'] }))
		.pipe(sourcemaps.write('./'))
		.pipe(gulp.dest('css'))
		.pipe(browserSync.reload({
			stream: true
		}));
});

gulp.task('build-js', () => 
	gulp.src('js/index.js')
		.pipe(babel({
			presets: ['env']
		}))
		.pipe(gulp.dest('dist'))
);

gulp.task('browserSync', () => {
	browserSync.init({
		server: {
			baseDir: './'
		},
	});
});

gulp.task('watch', ['browserSync', 'build'], () => {
	gulp.watch('scss/**/*.scss', ['build']);
	gulp.watch('*.html', browserSync.reload);
	gulp.watch('js/**/*/js', browserSync.reload);
});

gulp.task('default', ['watch', 'browserSync', 'build']);
