interface Props {
  stdout: string;
  stderr: string;
  returnCode: number | null;
}

export default function OutputPanel({
  stdout,
  stderr,
  returnCode,
}: Props) {

  if (returnCode === null) {
    return null;
  }

  return (
    <div className="output-panel">

      <div className="section-title">
        Execution result
      </div>

      <div className="return-code">
        Exit code: {returnCode}
      </div>

      {stdout && (
        <>
          <h4>stdout</h4>

          <pre className="output">
            {stdout}
          </pre>
        </>
      )}

      {stderr && (
        <>
          <h4>stderr</h4>

          <pre className="error-output">
            {stderr}
          </pre>
        </>
      )}

    </div>
  );
}