const _colorKeywords = {
    'aliceblue': '#F0F8FF',
    'antiquewhite': '#FAEBD7',
    'aqua': '#00FFFF',
    'aquamarine': '#7FFFD4',
    'azure': '#F0FFFF',
    'beige': '#F5F5DC',
    'bisque': '#FFE4C4',
    'black': '#000000',
    'blanchedalmond': '#FFEBCD',
    'blue': '#0000FF',
    'blueviolet': '#8A2BE2',
    'brown': '#A52A2A',
    'burlywood': '#DEB887',
    'cadetblue': '#5F9EA0',
    'chartreuse': '#7FFF00',
    'chocolate': '#D2691E',
    'coral': '#FF7F50',
    'cornflowerblue': '#6495ED',
    'cornsilk': '#FFF8DC',
    'crimson': '#DC143C',
    'cyan': '#00FFFF',
    'darkblue': '#00008B',
    'darkcyan': '#008B8B',
    'darkgoldenrod': '#B8860B',
    'darkgray': '#A9A9A9',
    'darkgreen': '#006400',
    'darkgrey': '#A9A9A9',
    'darkkhaki': '#BDB76B',
    'darkmagenta': '#8B008B',
    'darkolivegreen': '#556B2F',
    'darkorange': '#FF8C00',
    'darkorchid': '#9932CC',
    'darkred': '#8B0000',
    'darksalmon': '#E9967A',
    'darkseagreen': '#8FBC8F',
    'darkslateblue': '#483D8B',
    'darkslategray': '#2F4F4F',
    'darkslategrey': '#2F4F4F',
    'darkturquoise': '#00CED1',
    'darkviolet': '#9400D3',
    'deeppink': '#FF1493',
    'deepskyblue': '#00BFFF',
    'dimgray': '#696969',
    'dimgrey': '#696969',
    'dodgerblue': '#1E90FF',
    'firebrick': '#B22222',
    'floralwhite': '#FFFAF0',
    'forestgreen': '#228B22',
    'fuchsia': '#FF00FF',
    'gainsboro': '#DCDCDC',
    'ghostwhite': '#F8F8FF',
    'gold': '#FFD700',
    'goldenrod': '#DAA520',
    'gray': '#808080',
    'green': '#008000',
    'greenyellow': '#ADFF2F',
    'grey': '#808080',
    'honeydew': '#F0FFF0',
    'hotpink': '#FF69B4',
    'indianred': '#CD5C5C',
    'indigo': '#4B0082',
    'ivory': '#FFFFF0',
    'khaki': '#F0E68C',
    'lavender': '#E6E6FA',
    'lavenderblush': '#FFF0F5',
    'lawngreen': '#7CFC00',
    'lemonchiffon': '#FFFACD',
    'lightblue': '#ADD8E6',
    'lightcoral': '#F08080',
    'lightcyan': '#E0FFFF',
    'lightgoldenrodyellow': '#FAFAD2',
    'lightgray': '#D3D3D3',
    'lightgreen': '#90EE90',
    'lightgrey': '#D3D3D3',
    'lightpink': '#FFB6C1',
    'lightsalmon': '#FFA07A',
    'lightseagreen': '#20B2AA',
    'lightskyblue': '#87CEFA',
    'lightslategray': '#778899',
    'lightslategrey': '#778899',
    'lightsteelblue': '#B0C4DE',
    'lightyellow': '#FFFFE0',
    'lime': '#00FF00',
    'limegreen': '#32CD32',
    'linen': '#FAF0E6',
    'magenta': '#FF00FF',
    'maroon': '#800000',
    'mediumaquamarine': '#66CDAA',
    'mediumblue': '#0000CD',
    'mediumorchid': '#BA55D3',
    'mediumpurple': '#9370DB',
    'mediumseagreen': '#3CB371',
    'mediumslateblue': '#7B68EE',
    'mediumspringgreen': '#00FA9A',
    'mediumturquoise': '#48D1CC',
    'mediumvioletred': '#C71585',
    'midnightblue': '#191970',
    'mintcream': '#F5FFFA',
    'mistyrose': '#FFE4E1',
    'moccasin': '#FFE4B5',
    'navajowhite': '#FFDEAD',
    'navy': '#000080',
    'oldlace': '#FDF5E6',
    'olive': '#808000',
    'olivedrab': '#6B8E23',
    'orange': '#FFA500',
    'orangered': '#FF4500',
    'orchid': '#DA70D6',
    'palegoldenrod': '#EEE8AA',
    'palegreen': '#98FB98',
    'paleturquoise': '#AFEEEE',
    'palevioletred': '#DB7093',
    'papayawhip': '#FFEFD5',
    'peachpuff': '#FFDAB9',
    'peru': '#CD853F',
    'pink': '#FFC0CB',
    'plum': '#DDA0DD',
    'powderblue': '#B0E0E6',
    'purple': '#800080',
    'rebeccapurple': '#663399',
    'red': '#FF0000',
    'rosybrown': '#BC8F8F',
    'royalblue': '#4169E1',
    'saddlebrown': '#8B4513',
    'salmon': '#FA8072',
    'sandybrown': '#F4A460',
    'seagreen': '#2E8B57',
    'seashell': '#FFF5EE',
    'sienna': '#A0522D',
    'silver': '#C0C0C0',
    'skyblue': '#87CEEB',
    'slateblue': '#6A5ACD',
    'slategray': '#708090',
    'slategrey': '#708090',
    'snow': '#FFFAFA',
    'springgreen': '#00FF7F',
    'steelblue': '#4682B4',
    'tan': '#D2B48C',
    'teal': '#008080',
    'thistle': '#D8BFD8',
    'tomato': '#FF6347',
    'turquoise': '#40E0D0',
    'violet': '#EE82EE',
    'wheat': '#F5DEB3',
    'white': '#FFFFFF',
    'whitesmoke': '#F5F5F5',
    'yellow': '#FFFF00',
    'yellowgreen': '#9ACD32'
}

export class Color {
    r = 0
    g = 0
    b = 0
    a = 255

    constructor(str?: string) {
        if (str) {
            this.setStyle(str)
        }
    }

    equal(color: Color) {
        return this.r === color.r && this.g === color.g && this.b === color.b && this.a === color.a
    }

    toHex() {
        return `#${[
            Math.round(this.r * 255).toString(16).padStart(2, '0'),
            Math.round(this.g * 255).toString(16).padStart(2, '0'),
            Math.round(this.b * 255).toString(16).padStart(2, '0')
        ].join('')}`
    }

    toHexa() {
        return `#${[
            Math.round(this.r * 255).toString(16).padStart(2, '0'),
            Math.round(this.g * 255).toString(16).padStart(2, '0'),
            Math.round(this.b * 255).toString(16).padStart(2, '0'),
            Math.round(this.a * 255).toString(16).padStart(2, '0')
        ].join('')}`
    }

    toRgb() {
        return {
            r: Math.round(this.r * 255),
            g: Math.round(this.g * 255),
            b: Math.round(this.b * 255),
            a: this.a
        }
    }

    toHsl() {
        const r = this.r
        const g = this.g
        const b = this.b

        let max = Math.max(r, g, b), min = Math.min(r, g, b);
        let h = 0, s, l = (max + min) / 2;

        if (max == min) {
            h = s = 0;
        } else {
            let d = max - min;
            s = l > 0.5 ? d / (2 - max - min) : d / (max + min);

            switch (max) {
                case r: h = (g - b) / d + (g < b ? 6 : 0); break;
                case g: h = (b - r) / d + 2; break;
                case b: h = (r - g) / d + 4; break;
            }

            h /= 6;
        }

        h *= 360
        s *= 100
        l *= 100

        return { h, s, l }
    }

    toHsv() {
        const r = this.r
        const g = this.g
        const b = this.b

        let max = Math.max(r, g, b), min = Math.min(r, g, b);
        let h = 0, s, v = max;

        let d = max - min;
        s = max == 0 ? 0 : d / max;

        if (max == min) {
            h = 0;
        } else {
            switch (max) {
                case r: h = (g - b) / d + (g < b ? 6 : 0); break;
                case g: h = (b - r) / d + 2; break;
                case b: h = (r - g) / d + 4; break;
            }

            h /= 6;
        }

        h *= 360
        s *= 100
        v *= 100

        return { h, s, v }
    }

    setHex(hex: string) {
        const m = /^#([A-Fa-f\d]{3,4}|[A-Fa-f\d]{6}|[A-Fa-f\d]{8})$/.exec(hex)
        if (!m) {
            throw new Error('Invalid hex color')
        }

        let value = m[1]

        if (value.length === 3 || value.length === 4) {
            value = value
                .split('')
                .map(c => c + c)
                .join('')
        }

        const r = value.substring(0, 2)
        const g = value.substring(2, 4)
        const b = value.substring(4, 6)
        const a = value.substring(6, 8) || 'ff'

        this.r = parseInt(r, 16) / 255
        this.g = parseInt(g, 16) / 255
        this.b = parseInt(b, 16) / 255
        this.a = parseInt(a, 16) / 255

        return this
    }

    setRgb(r: number, g: number, b: number, a = 1) {
        this.r = r / 255
        this.g = g / 255
        this.b = b / 255
        this.a = a

        return this
    }

    setHsl(hue: number, saturation: number, lightness: number, alpha = 1) {
        const h = hue / 360;
        const s = saturation / 100;
        const l = lightness / 100;

        if (s === 0) {
            const val = Math.round(l * 255)
            return this.setRgb(val, val, val, alpha)
        }

        const c = (1 - Math.abs(2 * l - 1)) * s;
        const x = c * (1 - Math.abs(((h / 60) % 2) - 1));
        const m = l - c / 2;

        let r = 0, g = 0, b = 0;
        const h2 = hue / 60;

        if      (h2 < 1) { r = c; g = x; b = 0; }
        else if (h2 < 2) { r = x; g = c; b = 0; }
        else if (h2 < 3) { r = 0; g = c; b = x; }
        else if (h2 < 4) { r = 0; g = x; b = c; }
        else if (h2 < 5) { r = x; g = 0; b = c; }
        else            { r = c; g = 0; b = x; }

        this.r = Math.round(r + m)
        this.g = Math.round(g + m)
        this.b = Math.round(b + m)
        this.a = alpha

        return this
    }

    setHsv(h: number, s: number, v: number, a = 1) {
        let r = 0, g = 0, b = 0;
        let i = Math.floor(h * 6);
        let f = h * 6 - i;
        let p = v * (1 - s);
        let q = v * (1 - f * s);
        let t = v * (1 - (1 - f) * s);

        switch (i % 6) {
            case 0: r = v; g = t; b = p; break;
            case 1: r = q; g = v; b = p; break;
            case 2: r = p; g = v; b = t; break;
            case 3: r = p; g = q; b = v; break;
            case 4: r = t; g = p; b = v; break;
            case 5: r = v; g = p; b = q; break;
        }

        this.r = r
        this.g = g
        this.b = b
        this.a = a

        return this
    }

    setStyle(style: string) {
        let m = /^(\w+)\(([^)]*)\)/.exec( style );

        if (m) {
            let color
            const name = m[1]
            const components = m[2]

            switch (name) {
                case 'rgb':
                case 'rgba':
                    // rgb(255,0,0) rgba(255,0,0,0.5)
                    color = /^\s*(\d+)\s*,\s*(\d+)\s*,\s*(\d+)\s*(?:,\s*(\d*\.?\d+)\s*)?$/.exec(components)
                    if (color) {
                        return this.setRgb(
                            Math.min(255, parseInt(color[1], 10)),
                            Math.min(255, parseInt(color[2], 10)),
                            Math.min(255, parseInt(color[3], 10)),
                            parseFloat(color[4]) || 1
                        );
                    }

                    // rgb(100%,0%,0%) rgba(100%,0%,0%,0.5)
                    color = /^\s*(\d+)%\s*,\s*(\d+)%\s*,\s*(\d+)%\s*(?:,\s*(\d*\.?\d+)\s*)?$/.exec(components)
                    if (color) {
                        return this.setRgb(
                            255 * (Math.min(100, parseInt(color[1], 10)) / 100),
                            255 * (Math.min(100, parseInt(color[2], 10)) / 100),
                            255 * (Math.min(100, parseInt(color[3], 10)) / 100),
                            parseFloat(color[4]) || 1
                        );
                    }
                    break;
                case 'hsl':
                case 'hsla':
                    // hsl(120,50%,50%) hsla(120,50%,50%,0.5)
                    color = /^\s*(\d*\.?\d+)\s*,\s*(\d*\.?\d+)%\s*,\s*(\d*\.?\d+)%\s*(?:,\s*(\d*\.?\d+)\s*)?$/.exec(components)
                    if (color) {
                        return this.setHsl(
                            parseFloat(color[1]),
                            parseFloat(color[2]),
                            parseFloat(color[3]),
                            parseFloat(color[4]),
                        );

                    }
                    break;
                default:
                    console.warn('Color: Unknown color model ' + style);
            }
        }

        // hex color
        m = /^#([A-Fa-f\d]+)$/.exec( style )
        if (m) {
            const hex = m[1];
            const size = hex.length;

            // #ff0
            if ( size === 3 ) {
                return this.setRgb(
                    parseInt(hex.charAt(0), 16) / 15,
                    parseInt(hex.charAt(1), 16) / 15,
                    parseInt(hex.charAt(2), 16) / 15,
                );
            }

            // #ff0000
            if (size === 6) {
                return this.setHex(style);
            }

            // #ff0000ff
            if (size === 8) {
                return this.setHex(style);
            }

            console.warn(`Color: Invalid hex color [${style}]`);
        }

        return this.setColorName(style)
    }

    setColorName(name: string) {
        //@ts-ignore
        const color = _colorKeywords[name.toLowerCase()]

        if (!color) {
            console.warn(`Color: Unknown color [${name}]`)
            return this
        }

        return this.setHex(color)
    }

    setImageData(data: ImageDataArray) {
        return this.setRgb(data[0], data[1], data[2], data[3] / 255)
    }

    clone() {
        const color = new Color()

        color.r = this.r
        color.g = this.g
        color.b = this.b
        color.a = this.a

        return color
    }

    static red() {
        return new Color().setRgb(255, 0, 0)
    }

    static green() {
        return new Color().setRgb(0, 255, 0)
    }

    static blue() {
        return new Color().setRgb(0, 0, 255)
    }

    static white() {
        return new Color().setRgb(255, 255, 255)
    }

    static black() {
        return new Color().setRgb(0, 0, 0)
    }
}
