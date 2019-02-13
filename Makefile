install:
	bundle install --path vendor/bundle

update:
	bundle update --path vendor/bundle

serve:
	bundle exec jekyll serve --watch --port 8080 --config _config.yml,_config.dev.yml
