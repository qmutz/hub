import { isArray } from 'lodash';
import isUndefined from 'lodash/isUndefined';
import React from 'react';
import { GoLink } from 'react-icons/go';

import getAnchorValue from '../../utils/getAnchorValue';
import history from '../../utils/history';
import styles from './AnchorHeader.module.css';
interface Props {
  level: number;
  title?: string;
  children?: JSX.Element[];
  scrollIntoView: (id?: string) => void;
}

const AnchorHeader: React.ElementType = (props: Props) => {
  let value = props.title;
  if (isUndefined(value) && props.children && props.children.length > 0) {
    const el = props.children![0];
    if (el.props.children && isArray(el.props.children)) {
      value = el.props.children[0].props.value;
    } else {
      value = el.props.value || el.props.href;
    }
  }

  if (isUndefined(value)) return null;

  // Get proper value when header is wrapped into html tag
  if (value.startsWith('<')) {
    props.children!.forEach((child: any) => {
      if (child.props && child.props.value && !child.props.value.startsWith('<')) {
        value = child.props.value;
        return;
      }
    });
  }

  const Tag = `h${props.level}` as 'h1' | 'h2' | 'h3' | 'h4' | 'h5' | 'h6';
  const anchor = getAnchorValue(value);

  return (
    <span className={styles.header}>
      <Tag className={`position-relative anchorHeader ${styles.headingWrapper}`}>
        <div data-testid="anchor" className={`position-absolute ${styles.headerAnchor}`} id={anchor} />
        <a
          data-testid="anchorHeaderLink"
          href={`${history.location.pathname}#${anchor}`}
          onClick={(e: React.MouseEvent<HTMLAnchorElement, MouseEvent>) => {
            e.preventDefault();
            e.stopPropagation();
            props.scrollIntoView(`#${anchor}`);
          }}
          role="button"
          className={`text-reset text-center d-none d-md-block ${styles.headingLink}`}
          aria-label={value}
        >
          <GoLink />
        </a>
        {props.title || props.children}
      </Tag>
    </span>
  );
};

export default AnchorHeader;
