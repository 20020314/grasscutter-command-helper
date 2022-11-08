import { config, cacheModel, dataCache, DATA_VERSION, getUrlData } from "./init.js";
import { mask, showMessage } from "./ui.js";
import { langData } from "./lang-loader.js";

/** 
 * @typedef {import('./command-builder').ParamVO} ParamVO 
 */

/**
 * @typedef { {name: string, children: ModalDTO[]}[] } ModalList
 */

/**
 * @typedef { object } ModalDTO
 * @property { string | number } [id]
 * @property { string[] | number[] } [ids]
 * @property { string } name
 * @property { string } [icon]
 * @property { string[] } [filter]
 * @property { ModalDTO[] } [children]
 */

/**
 * @typedef { object } ZippedModalList
 * @property { string } name
 * @property { [(string | number)[], string[]] } data
 */

/**
 * @typedef { {name: string, filters: string[]} } FilterGroup
 */

/**
 * @param { string } id
 * @return { Promise<ModalDTO[]> }
 */
const getModalList = id =>
    getUrlData(`./data/${config.lang}/${DATA_VERSION}/${id}.json`
        // , { unzip: true }
    )

/**
 * @return { Promise<FilterGroup[]> }
 */
const getFilterGroupList = id => getUrlData(`./data/${config.lang}/${DATA_VERSION}/menu.json`, { showMessage: false })
    .then(menus => menus.filter(m => m.type === id))
    .then(menus => {
        if (!menus?.length) throw new Error()
        const filterGroupList = []
        menus.forEach(menu => {
            filterGroupList.push(...menu.filterGroups)
        })
        return filterGroupList
    })
/**
 * @param { ZippedModalList } zippedModalList 
 * @return { ModalDTO[] }
 */
const unzipModalData = zippedModalList => {
    const modalList = []
    zippedModalList.forEach(modalGroup => {
        const classify = { name: modalGroup.name, children: [] }
        for (let index = 0; index < modalGroup.data[0].length; index++) {
            classify.children.push({
                id: modalGroup.data[0][index],
                name: modalGroup.data[1][index]
            })
        }
        modalList.push(classify)
    })
    // console.log(modalList)
    return modalList
}

export { unzipModalData }

const modalSelectElement = document.getElementById('modal-select')
const modalSelectDataElement = document.getElementById('modal-select-data')
const modalSearchInput = document.getElementById('modal-search')
const modalSelectCloseElement = document.getElementById('modal-search-clear')
const modalSearchSettingElement = document.getElementById('modal-srarch-setting')


class ModalSelect {
    /** @param { ParamVO } param */
    constructor(param) {
        this.type = param.type
        this.param = param
        modalSearchInput.select = this
        modalSearchInput.addEventListener('change', this.#onFiltrate)
        modalSelectCloseElement.addEventListener('click', this.clear)


    }

    /** @param {string} [keyword] */
    show(keyword) {

        getFilterGroupList(this.type).then(filterGroupList => {
            this.filterDiv = document.createElement('div')

            filterGroupList.forEach(filterGroup => {
                const groupDiv = document.createElement('div')

                const title = document.createElement('p')
                title.innerHTML = filterGroup.name
                groupDiv.appendChild(title)

                filterGroup.filters.forEach(filter => {
                    const div = document.createElement('div')

                    const input = document.createElement('input')
                    input.setAttribute('type', 'radio')
                    input.setAttribute('name', filterGroup.name)
                    div.appendChild(input)

                    const span = document.createElement('span')
                    span.innerHTML = filter
                    div.appendChild(span)

                    groupDiv.appendChild(div)
                })

                this.filterDiv.appendChild(groupDiv)
            })

            modalSearchSettingElement.innerHTML = ''
            modalSearchSettingElement.appendChild(this.filterDiv)
        })

        modalSelectDataElement.innerHTML = ''
        modalSelectDataElement.removeEventListener('scroll', this.#loadMore)


        getModalList(this.type).then(modalList => {
            modalSelectElement.style.display = 'block'
            mask.onclick(e => this.hide()).show()

            const filteredModalGroupList = keyword ?
                modalList.filter(group =>
                    group.name.includes(keyword)
                ) : modalList

            /** @type { [string | ModalDTO] } */
            this.displayList = filteredModalGroupList

            this.#loadModalSelectData(this.displayList.slice(0, 99))
            if (this.displayList.length > 100) modalSelectDataElement.addEventListener('scroll', this.#loadMore)
        })
    }

    #loadMore = e => {
        if (e.target.scrollHeight - (e.target.clientHeight + e.target.scrollTop) > 260) return
        modalSelectDataElement.removeEventListener('scroll', this.#loadMore)
        let i = modalSelectDataElement.childElementCount
        console.log(this.displayList)
        this.#loadModalSelectData(this.displayList.slice(i, i + 99))
    }

    /** @param { ModalDTO[] } modals */
    #loadModalSelectData(modals) {
        modals.forEach(modal => {
            if (!modal.children?.length) {
                let id = modal.id ?? modal.ids[0]

                const div = document.createElement('div')
                div.appendCommand(id, modal.name)
                if (modal.filter) div.appendTag(...modal.filter)
                modalSelectDataElement.appendChild(div)

                div.addEventListener('click', e => {
                    this.param.value = { label: modal.name, value: id }
                    this.hide()
                })

                return
            }

            const details = document.createElement('details')
            const summary = document.createElement('summary')

            summary.innerHTML = modal.name
            if (modal.filter) summary.appendTag(...modal.filter)
            details.appendChild(summary)

            modal.children.forEach(child => {
                const div = document.createElement('div')
                if (child.icon) {
                    const icon = document.createElement('img')
                    icon.src = child.icon
                    div.appendChild(icon)
                }

                let id = child.id ?? child.ids[0]

                div.appendTag(child.type)
                div.appendCommand(id, child.name)
                details.appendChild(div)

                div.addEventListener('click', e => {
                    this.param.value = { label: child.name, value: id }
                    this.hide()
                })
            })

            modalSelectDataElement.appendChild(details)
        })

        if (modals.length == 99)
            modalSelectDataElement.addEventListener('scroll', this.#loadMore)
    }

    hide = () => {
        modalSearchInput.select = null
        modalSearchInput.value = ''
        modalSelectDataElement.removeEventListener('scroll', this.#loadMore)
        modalSearchInput.removeEventListener('change', this.#onFiltrate)
        modalSelectCloseElement.removeEventListener('click', this.clear)
        modalSelectElement.style.display = 'none'
        mask.hide()
    }

    /** @param { Event } */
    #onFiltrate() {
        this.select.show(modalSearchInput.value)
    }

    clear = () => {
        modalSearchInput.value = ''
        this.show()
    }
}

export { ModalSelect }