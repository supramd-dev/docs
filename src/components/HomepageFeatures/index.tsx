import type {ReactNode} from 'react';
import clsx from 'clsx';
import Heading from '@theme/Heading';
import styles from './styles.module.css';

type FeatureItem = {
  title: string;
  Svg: React.ComponentType<React.ComponentProps<'svg'>>;
  description: ReactNode;
};

const FeatureList: FeatureItem[] = [
  {
    title: 'Massively Parallel MD simulation',
    Svg: require('@site/static/img/undraw_docusaurus_mountain.svg').default,
    description: (
      <>
        Expanded to 4x10^12 and <b>3x10^13</b> atoms on Sunway supercomputer and Intelligent supercomputers.
        GPU support is available for <b>Hygon DCUs</b>, NVIDIA and AMD GPUs. 
      </>
    ),
  },
  {
    title: 'Full-featured Material Simulation',
    Svg: require('@site/static/img/undraw_docusaurus_tree.svg').default,
    description: (
      <>
        Professional simulator for material. 
        Full ensemble support (NVE, NVT, NPT), various force fields (Empirical potential, AI potential, APIs for customized potential),
        and many analysis tools are available.
      </>
    ),
  },
  {
    title: 'Parallel kinetic Monte Carlo simulation',
    Svg: require('@site/static/img/undraw_docusaurus_react.svg').default,
    description: (
      <>
        With on-lattice and off-lattice models, it can be used to simulate the growth of thin films, the evolution of microstructures, and the diffusion of atoms in materials.
      </>
    ),
  },
];

function Feature({title, Svg, description}: FeatureItem) {
  return (
    <div className={clsx('col col--4')}>
      <div className="text--center">
        <Svg className={styles.featureSvg} role="img" />
      </div>
      <div className="text--center padding-horiz--md">
        <Heading as="h3">{title}</Heading>
        <p>{description}</p>
      </div>
    </div>
  );
}

export default function HomepageFeatures(): ReactNode {
  return (
    <section className={styles.features}>
      <div className="container">
        <div className="row">
          {FeatureList.map((props, idx) => (
            <Feature key={idx} {...props} />
          ))}
        </div>
      </div>
    </section>
  );
}
