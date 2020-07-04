class Grid {
	data;
	constructor(json) {
		this.url = json
	}

	load(selector) {
		$.get(this.url, data => {
			if (typeof data === "string")
				data = JSON.parse(data)
			this.data = data.items
			if (this.data.constructor.name !== "Array")
				this.data = []
			this.metadata = data.metadata

			const block1 = $(selector)
			block1.empty()
			const block = $("<div>").addClass("grid-wrapper")
			for (let i of this.data) {
				const current = $("<div>").addClass("grid-element").attr("id", i.id)
				Grid.fill(current, this.metadata, i)
				current.appendTo(block)
			}
			block.appendTo(block1)
		}).catch(console.error)
	}

	static fill(block, metadata, obj) {
		switch (metadata.type) {
			case "projects":
				const top = $("<div>").addClass("grid-element-top")

				const language = obj.language === "en" ? "us" : obj.language
				const { url, codeURL, name, description } = obj
				$("<a>").addClass("h4").html(name).attr("href", url).appendTo(top)

				if (codeURL) {
					const { codeLinkContent } = metadata
					$("<a>").addClass("h5").html(codeLinkContent).attr("href", codeURL).appendTo(top)
				}

				$("<img>").addClass("icon").attr("src", `https://www.countryflags.io/${language}/shiny/64.png`).appendTo(top)
				top.appendTo(block)

				const bottom = $("<div>").addClass("grid-element-bottom").appendTo(block)
				$("<p>").html(description.replace(/_/g, "&nbsp;")).appendTo(bottom)

				break
		}
	}
}