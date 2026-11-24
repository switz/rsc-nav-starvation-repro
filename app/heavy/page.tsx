import { Row } from '../row';
export default function Heavy() {
  return <div><h1 id="dest">heavy</h1><ol>{Array.from({ length: 400 }, (_, i) => <Row key={i} i={i} />)}</ol></div>;
}
