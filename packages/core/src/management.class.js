function HookComponent({ context }) {
  context.processHooks();
  useEffect(
    () => () => {
      // onUnmounted
      context.runUnmountedEffects();
    },
    [],
  );
  return null;
}
function $reactive(setup) {
  return class extends React.Component {
    constructor(props) {
      super(props);
      this.reactiveContext = createContext(props, this.forceUpdate.bind(this));
      // onBeforeMount
      this.reactiveContext.runOnBeforeMountedEffects();
      setContext(context);
      context.children = setup(this.reactiveContext.props);
      unsetContext();
    }

    componentDidMount() {
      // onMounted
      this.reactiveContext.runOnMountedEffects();
    }

    getSnapshotBeforeUpdate() {
      this.reactiveContext.onPropsChange(this.props);
      // watch/watchEffect - flush: "pre"
      // onBeforeUpdate
      this.reactiveContext.runBeforeRenderEffects();
    }
    componentDidUpdate() {
      // watch/watchEffect - flush: "post"
      // onUpdated
      this.reactiveContext.runEffects();
    }

    componentWillUnmount() {
      // onBeforeUnmount
      this.reactiveContext.runBeforeUnmountEffects();
    }

    render() {
      return (
        <>
          {this.reactiveContext.processHooks()}
          {this.reactiveContext.render()}
        </>
      );
    }
  };
}
