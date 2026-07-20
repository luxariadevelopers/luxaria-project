const React = require('react');

function mockComponent(name) {
  return function Mock(props) {
    return React.createElement(name, props, props.children);
  };
}

module.exports = {
  View: mockComponent('View'),
  Text: mockComponent('Text'),
  ActivityIndicator: mockComponent('ActivityIndicator'),
  StyleSheet: {
    create: (styles) => styles,
  },
  Platform: { OS: 'ios', select: (spec) => spec.ios ?? spec.default },
};
