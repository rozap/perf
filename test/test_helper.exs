defmodule Perf.TestHelpers do
  alias Phoenix.Socket.Reply

  def wait_for(ref) do
    receive do
      %Reply{payload: p, ref: ^ref} -> p
    end
  end
end
ExUnit.configure seed: elem(:os.timestamp, 2)
ExUnit.start(timeout: 5_000)
Ecto.Adapters.SQL.Sandbox.mode(Perf.Repo, :manual)

