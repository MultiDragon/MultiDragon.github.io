class Grid {
	constructor(json) {
		this.url = json
	}

	load() {
		$.get(this.url, e => {
			const data = JSON.parse(e)
			this.data = data.items
			if (this.data.constructor.name !== "Array")
				this.data = []
			this.metadata = data.metadata
		})
	}

	display(selector) {
		const block1 = $(selector)
		block1.empty()
		const block = $("<div>").addClass("grid-wrapper")
		for (let i of this.data) {
			const current = $("<div>").addClass("grid-element").attr("id", i.id)
			Grid.fill(current, this.metadata, i)
			current.appendTo(block1)
		}
		block.appendTo(block1)
	}

	static fill(block, metadata, obj) {
		switch (metadata.type) {
			case "projects":
				const { url, codeURL, name, description, language } = obj
				const linkBase = $("<a>").attr("href", url).appendTo(block)
				$("<h4>").html(name).appendTo(linkBase)

				if (codeURL) {
					const { codeLinkContent } = metadata
					const linkCode = $("<a>").attr("href", codeURL).appendTo(block)
					$("<h5>").html(codeLinkContent).appendTo(linkCode)
				}

				$("<img>").addClass("icon").attr("src", `https://www.countryflags.io/${language}/shiny/64.png`).appendTo(block)
				$("<p>").html(description).appendTo(block)

				break
		}
	}
}