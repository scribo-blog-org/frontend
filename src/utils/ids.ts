const toId = (value: any) => (value == null ? "" : String(value))

const sameId = (a: any, b: any) => toId(a) === toId(b) && toId(a) !== ""

const hasId = (list: any = [], id: any) => list.some((item: any) => sameId(item, id))

const withId = (list: any = [], id: any) => (hasId(list, id) ? list : [...list, id])

const withoutId = (list: any = [], id: any) => list.filter((item: any) => !sameId(item, id))

const setIdPresent = (list: any = [], id: any, present: any) => (present ? withId(list, id) : withoutId(list, id))

export { toId, sameId, hasId, withId, withoutId, setIdPresent }
