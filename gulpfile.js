var gulp = require('gulp'),
  less = require('gulp-less'),
  uglify = require('gulp-uglify'),
  spawn = require('child_process').spawn,
  minifyCSS = require('gulp-minify-css'),
  browserify = require('browserify'),
  source = require('vinyl-source-stream'),
  sourcemaps = require('gulp-sourcemaps'),
  stringify = require('stringify'),
  buffer = require('vinyl-buffer'),
  watchify = require('watchify'),
  babel = require('babelify'),
  elm = require('gulp-elm');

var paths = {
  js: {
    app: {
      src: './web/static/js/app.js',
      dest: './priv/static/js/',
      watch: [
        './web/static/js/*.js',
        './web/static/js/*/*.js'
      ]
    },
  },

  elm : {
    src: './web/elm/*.elm',
    dest: './priv/static/js/',
    watch: ['./web/elm/*elm']
  },

  less: {
    src: './web/less/app.less',
    dest: './priv/static/css/',
    watch: ['./web/less/*.less'],
  },
  fonts: {
    src: './web/static/fonts/*',
    dest: './priv/static/fonts/',
  },
  images: {
    src: './web/static/images/*',
    dest: './priv/static/images/',
  }


};


var bundler = watchify(browserify(paths.js.app.src, {
  debug: true
}).transform(babel));


gulp.task('elm-init', elm.init);

gulp.task('elm', ['elm-init'], function() {
  console.log("-> Compiling elm")
  return gulp.src(paths.elm.src)
    .pipe(elm.bundle('elm-app.js'))
    .on('error', function(err) {
      console.error(err.message);
      this.emit('end');
    })
    .pipe(gulp.dest(paths.elm.dest));
});


gulp.task('app', ['elm'], function() {
  bundler.bundle()
    .on('error', function(err) {
      console.error(err);
      this.emit('end');
    })
    .pipe(source('app.js'))
    .pipe(buffer())
    .pipe(sourcemaps.init({
      loadMaps: true
    }))
    .pipe(sourcemaps.write('./'))
    .pipe(gulp.dest(paths.js.app.dest));

  console.log("-> Done compiling js")
});



gulp.task('less', function() {
  console.log("Rebuilding less files...");
  gulp.src(paths.less.src)
    .pipe(less({
      paths: ['app.less']
    }))
    .pipe(minifyCSS())
    .pipe(gulp.dest(paths.less.dest));
});

gulp.task('fonts', function() {
  gulp.src(paths.fonts.src)
    .pipe(gulp.dest(paths.fonts.dest));
});

gulp.task('images', function() {
  gulp.src(paths.images.src)
    .pipe(gulp.dest(paths.images.dest));
});


gulp.task('rebuild', function() {
  gulp.watch(paths.js.app.watch, ['app']);
  gulp.watch(paths.elm.watch, ['elm']);
  gulp.watch(paths.less.watch, ['less']);
});



gulp.task('watch', ['app', 'less', 'fonts', 'images', 'rebuild']);
// gulp.task('deploy', ['app', 'less', 'fonts', 'images']);