// Hand-maintained, NOT generated. This is the emscripten/embind runtime glue every
// opencv.js object rides on top of - none of it comes from OpenCV's own C++ headers, so
// doxygen can never generate it. Ported from mirada/doxygen2typescript's
// exportsHacks.ts#missingImports/#mat_'s runtime section.

export declare function onRuntimeInitialized(): void;
export declare function exceptionFromPtr(err: number): any;
export declare function FS_createDataFile(
  parent: string,
  name: string,
  data: Uint8Array,
  canRead: boolean,
  canWrite: boolean,
  canOwn: boolean
): void;

// embind internals, exposed on every bound instance.
export declare function getInheritedInstanceCount(): number;
export declare function getLiveInheritedInstances(): any[];
export declare function flushPendingDeletes(): void;
export declare function setDelayFunction(fn: (fn: () => void) => void): void;

export declare class EmscriptenEmbindInstance {
  isAliasOf(other: EmscriptenEmbindInstance): boolean;
  clone(): this;
  delete(): void;
  isDeleted(): boolean;
  deleteLater(): this;
}

export declare class InternalError extends Error {}
export declare class BindingError extends Error {}
export declare class UnboundTypeError extends Error {}
export declare class PureVirtualError extends Error {}

export declare class Vector<T> extends EmscriptenEmbindInstance {
  size(): number;
  get(i: number): T;
  set(i: number, t: T): void;
  push_back(item: T): void;
  resize(count: number, value?: T): void;
  delete(): void;
}

export declare class IntVector extends Vector<number> {}
export declare class FloatVector extends Vector<number> {}
export declare class DoubleVector extends Vector<number> {}
export declare class UcharVector extends Vector<number> {}
export declare class CharVector extends Vector<number> {}
