import extend from '@form-create/utils/lib/extend';
import is from '@form-create/utils/lib/type';


export default function useRegister(Handler) {
    extend(Handler.prototype, {
        provider() {
            const ps = this.fc.providers;
            Object.keys(ps).forEach(k => {
                const prop = ps[k];
                prop._c = getComponent(prop);
                this.useProvider(prop);
                this.providers[k] = prop;
            });
        },
        useProvider(provider) {
            const used = [];
            (provider._c || ['*']).forEach(name => {
                const type = name === '*' ? '*' : this.getType(name);
                if (used.indexOf(type) > -1) return;
                used.push(type);
                this.bus.$on(`p:${provider.attr}:${type}:${provider.input ? 1 : 0}`, (event, args) => {
                    provider[event] && provider[event](...args);
                });
            });
            provider._used = used;
        },
        watchEffect(parser) {
            const vm = this.vm;
            Object.keys(parser.rule.effect || {}).forEach(k => {
                parser.watch.push(vm.$watch(() => parser.rule.effect[k], (n) => {
                    this.parserProp(parser, 'watch', {[k]: n});
                }));
            });
        },
        parserProp(parser, event, custom) {
            this.emitProp({
                rule: parser.rule,
                input: parser.input,
                type: parser.trueType,
                custom
            }, event);
        },
        ruleProp(rule, event) {
            this.emitProp({
                rule,
                input: !!rule.field,
                type: this.getType(rule.type)
            }, event);
        },
        emitProp({rule, input, type, custom}, event) {
            if (!type || type === 'fcFragment') return;
            const effect = custom ? custom : (rule.effect || {});
            Object.keys(effect).forEach(attr => {
                const p = this.providers[attr];
                if (!p || (p.input && !input)) return;
                let _type;
                if (!p._c) {
                    _type = '*';
                } else if (p._used.indexOf(type) > -1) {
                    _type = type;
                } else {
                    return;
                }
                this.bus.$emit(`p:${attr}:${_type}:${p.input ? 1 : 0}`, event, [effect[attr], rule, this.api]);
            });
        }
    });
}

function unique(arr) {
    return arr.filter(function (item, index, arr) {
        return arr.indexOf(item, 0) === index;
    });
}

function getComponent(p) {
    const c = p.components;
    if (Array.isArray(c)) return unique(c.filter(v => v !== '*'));
    else if (is.String(c)) return [c];
    else return false;
}
