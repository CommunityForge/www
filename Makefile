install:
	bundle install

update:
	bundle update

serve:
	bundle exec jekyll serve --watch --port 8080 --config _config.yml,_config.dev.yml
