defmodule Perf.Runner.Events do
  defmodule Success do
    defstruct at: 0,
      start_t: 0,
      end_t: 0,
      size: 0,
      request: :none,
      status: :none
  end

  defmodule Error do
    defstruct reason: :none,
      status: :none,
      request: :none,
      at: 0
  end

  defmodule StartingRequest do
    defstruct at: 0,
      request: :none,
      ref: :none
  end

  defmodule Done do
    defstruct at: 0,
      ref: :none
  end

end