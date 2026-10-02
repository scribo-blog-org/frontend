declare module '*.svg' {
    import type { FC, SVGProps } from 'react';

    const Content: FC<SVGProps<SVGSVGElement>>;
    export default Content;
}

declare module 'swagger-ui-dist/swagger-ui-es-bundle' {
    const SwaggerUIBundle: any;
    export default SwaggerUIBundle;
}

declare module '*.scss' {
    const content: string;
    export default content;
}
