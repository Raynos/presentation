gh-pages:
	git add -A
	git commit -m "update slides"
	git push origin master 
	git checkout gh-pages
	git pull origin master
	git push origin gh-pages
	git checkout master

test:
	firefox index.html

.PHONY: gh-pages test
