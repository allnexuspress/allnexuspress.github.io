const gulp = require('gulp');
const sass = require('gulp-sass');
const autoprefixer = require('gulp-autoprefixer');
const sourcemaps = require('gulp-sourcemaps');
const browserSync = require('browser-sync').create();

gulp.task('build', () => {
	return gulp
		.src('app/scss/**/*.scss')
		.pipe(sourcemaps.init())
		.pipe(sass({ outputStyle: 'expanded' })
			.on('error', sass.logError))
		.pipe(autoprefixer({ browsers: ['last 2 versions'] }))
		.pipe(sourcemaps.write('./'))
		.pipe(gulp.dest('app/css'))
		.pipe(browserSync.reload({
			stream: true
		}));
});

gulp.task('browserSync', () => {
	browserSync.init({
		server: {
			baseDir: 'app'
		},
	});
});

gulp.task('watch', ['browserSync', 'build'], () => {
	gulp.watch('app/scss/**/*.scss', ['build']);
	gulp.watch('app/*.html', browserSync.reload);
	gulp.watch('app/js/**/*/js', browserSync.reload);
});

gulp.task('default', ['watch', 'browserSync', 'build']);
